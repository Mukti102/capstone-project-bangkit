const ModelPredictor = require("../services/predictor");
const Papa = require('papaparse');

async function postPredictHandler(request, h) {
    const { bahari, budaya, cagar, pusat, taman, ibadah, lat, lon, radius } = request.payload;
    
    try {
        const predictor = new ModelPredictor();

        // Load the model
        await predictor.loadModel();
        console.log("Model sudah siap digunakan");

        // Predict using the model
        const result = await predictor.predict([bahari, budaya, cagar, pusat, taman, ibadah], lat, lon, radius);
        console.log(result);

        // Return the prediction result
        return h.response(result).code(200);
    } catch (error) {
        console.error("Error during prediction:", error);

        // Return error response
        return h.response({ error: "Failed to process prediction" }).code(500);
    }
}
async function getPlaceDetails(request,h) {
    const placeId =  request.params.placeId;
    async function loadCSVData(filePath) {
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
    const tourismDatasetUrl = 'https://storage.googleapis.com/bumi-aveshana-bucket/model-prod/model/data/tourism.csv';
    try {
        const data = await loadCSVData(tourismDatasetUrl);
        const placeDetails = data.find((place) => place.Place_Id === placeId);

        if (!placeDetails) {
            throw new Error("Tempat dengan ID tersebut tidak ditemukan.");
        }

        return placeDetails; // Mengembalikan detail tempat
    } catch (error) {
        console.error("Gagal mendapatkan detail tempat:", error);
        throw error;
    }
}


module.exports = {
    postPredictHandler,
    getPlaceDetails};
