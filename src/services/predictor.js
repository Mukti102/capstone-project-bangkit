const tf = require('@tensorflow/tfjs');
const path = require('path');
const Papa = require('papaparse');

class ModelPredictor {
    constructor() {
        this.model = null;
    }

    async loadModel() {
        try {
            const MODEL_URL = (process.env.MODEL_URL);
            this.model = await tf.loadLayersModel(MODEL_URL);

            console.log("Model berhasil dimuat:");
            this.model.summary(); 
        } catch (error) {
            console.error("Gagal memuat model:", error);
        }
    }

    async loadJSON(url) {
        const response = await fetch(url);
        return await response.json();
    }

    async loadCSV(filePath) {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Gagal memuat file CSV: ${response.statusText}`);
        }
        const text = await response.text();
        const rows = text.trim().split('\n'); 
        const data = rows.map(row => row.split(',')); 
        return data;
    }

    async genUserVecs(userVec, numItems) {
        const userVecArray = await userVec.array();
        let userVecsArray = Array(numItems).fill(userVecArray).map(item => [...item]);
        // const userVecsTensor = tf.tensor(userVecsArray);
        const userVecsTensor = tf.tile(userVec, [numItems, 1]);
        return userVecsTensor;
    }

    async calculateDistance (lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;
    
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
    
        return distance;
    }

    async getPredPlacesDf(yPu, dfTourism, givenLat, givenLon, radius = 10) {
        console.log("masuk ke getpredplaces")
        console.log(yPu.shape)
        console.log(dfTourism)
        const tableData = [];
        for (let i = 0; i < yPu.shape[0]; i++) {
          const originalIndex = i;
          const placeId = dfTourism[originalIndex].Place_Id;
          const placeName = dfTourism[originalIndex].Place_Name|| "Unknown Place";
          const arrayJS = yPu.arraySync();
          const rating = parseFloat(arrayJS[i]);
        //   console.log(rating)
          const placeInfo = dfTourism.find((row) => row.Place_Id === placeId);
        //   console.log(placeInfo)
        //   const deskripsi = placeInfo[]
          const lat = placeInfo.Lat;
          const lon = placeInfo.Long;
        //   console.log(yPu)
        // console.log('len data', tableData.length)
          const distance = await this.calculateDistance(givenLat, givenLon, lat, lon);
        //   console.log(lat, lon)
          if (distance <= radius) {
            tableData.push([placeId, placeName, rating, distance]);
            // console.log('data baru masuk', tableData)
          }
        }
        const dfPredPlaces = tableData.map((row) => ({
          "Place ID": row[0],
          "Place Name": row[1],
          "Predicted Rating": row[2].toFixed(2),
          "Distance (km)": row[3].toFixed(2),
        }));
        console.log(tableData)
        dfPredPlaces.sort((a, b) => b["Predicted Rating"] - a["Predicted Rating"]);

        console.log('datasort,', dfPredPlaces);
        return dfPredPlaces;
    }

    async loadCSVData(filePath) {
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV data: ${response.status}`);
        }
      
        const text = await response.text();
        const data = Papa.parse(text, {
          delimiter: ',',
          quoteChar: '"',
          escapeChar: '\\',
          header: true,
          skipEmptyLines: true,
        }).data;
      
        return data;
      }

    async predict(input_data, lat, lon, radius = 10) {
        try {
            if (!this.model) {
                throw new Error("Model belum dimuat");
            }

            console.log("Ini adalah predict js");
            let user_vec = tf.tensor([input_data]);
            console.log("user vektor input:");
            user_vec.print()
            // console.log("User shape = ", user_vec.shape)

            let item;
            try {
                item = await this.loadCSV('https://storage.googleapis.com/bumi-aveshana-storage-bucket/model/item.csv');
                console.log("Data CSV Item:", item);
                item = item.map(row => row.map(val => parseFloat(val)));
                console.log("Selesai membaca CSV");
            } catch (error) {
                console.error('Error membaca CSV:', error);
            }

            let item_vec = tf.tensor(item);
            item_vec = item_vec.slice([1, 0], [item_vec.shape[0] - 1, item_vec.shape[1]]);
            console.log("Item tensor:")
            item_vec.print()
            console.log('item shape', item_vec.shape)

            // console.log("User shape (sebelum gen user)= ", user_vec.shape)
            user_vec = await this.genUserVecs(user_vec, item_vec.shape[0])
            // console.log("user vector setelah genuservecs:")
            user_vec.print()
            // console.log("User shape (setelah gen user) = ", user_vec.shape)

            const scalers = await this.loadJSON('https://storage.googleapis.com/bumi-aveshana-storage-bucket/model/scalers.json');
            const scaledData = await this.loadJSON('https://storage.googleapis.com/bumi-aveshana-storage-bucket/model/scaled_data.json');
            console.log("1. Berhasil memuat scalers dan scaled data");

            const scalerItemMean = scalers.scaler_item_mean;
            const scalerItemScale = scalers.scaler_item_scale;

            const scalerUserMean = scalers.scaler_user_mean;
            const scalerUserScale = scalers.scaler_user_scale;

            const scalerTargetMean = scalers.scaler_target_mean;
            const scalerTargetScale = scalers.scaler_target_scale;

            const transformedUserTensor = user_vec.sub(tf.tensor(scalerUserMean)).div(tf.tensor(scalerUserScale));
            const transformedItemTensor = item_vec.sub(tf.tensor(scalerItemMean)).div(tf.tensor(scalerItemScale));

            console.log("Berhasil menscale data")
            transformedUserTensor.print();
            transformedItemTensor.print();

            console.log(transformedItemTensor.shape)
            console.log(transformedUserTensor.shape)

            console.log("Memulai prediksi...")
            const predictionResult = await this.model.predict([transformedUserTensor, transformedItemTensor]);
            predictionResult.print()
            console.log("scale hasil prediction")
            const scaledPredictionResult = predictionResult.mul(tf.tensor(scalerTargetScale)).add(tf.tensor(scalerTargetMean));
            scaledPredictionResult.print()
            
            console.log("Mulai melakukan pembacaan raw dataset");
            let data;
            try {
                data = await this.loadCSVData('https://storage.googleapis.com/bumi-aveshana-storage-bucket/model/data/tourism.csv');
                console.log("Data CSV raw:", data);
                console.log("Selesai membaca CSV");
            } catch (error) {
                console.error('Error membaca CSV:', error);
            }
            // console.log('data location', lat, lon, radius)
            const result = await this.getPredPlacesDf(scaledPredictionResult, data, lat, lon, radius)
            return result;
        } catch (e) {
            console.log("Error:", e);
        }
    }
}

module.exports = ModelPredictor