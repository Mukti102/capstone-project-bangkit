const tf = require('@tensorflow/tfjs');
const path = require('path');
async function loadModel() {
    try {
        const MODEL_PATH = `file://${path.resolve('./src/model/model5/model.json')}`;
        console.log("Path model:", MODEL_PATH); // Debug path
        this.model = await tf.loadLayersModel(MODEL_PATH);

        console.log("Model berhasil dimuat:");
        this.model.summary(); 
    } catch (error) {
        console.error("Gagal memuat model:", error);
    }
}
module.exports = loadModel