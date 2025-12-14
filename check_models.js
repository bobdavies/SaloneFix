// Run this with: node check_models.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

// PASTE YOUR KEY DIRECTLY HERE FOR THIS TEST
const genAI = new GoogleGenerativeAI("AIzaSyA0TX4vCYnrHG5v26498An0dYFnjn27iN4");

async function listModels() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    console.log("Checking API access...");
    
    // This is the specific call to see what you have access to
    // Note: The SDK doesn't expose a simple listModels() method in all versions, 
    // so we test the generation directly on a known stable model.
    const result = await model.generateContent("Hello");
    console.log("Success! gemini-1.5-flash is working.");
    console.log("Response:", result.response.text());
  } catch (error) {
    console.error("❌ Error Details:");
    console.error(error.message);
    console.error("If you see a 404, it means your key cannot 'see' this model.");
  }
}

listModels();