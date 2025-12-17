// Run with: node list_models.js
// IMPORTANT: Set your API key as an environment variable:
// Windows: set NEXT_PUBLIC_GEMINI_API_KEY=your_key_here && node list_models.js
// Linux/Mac: NEXT_PUBLIC_GEMINI_API_KEY=your_key_here node list_models.js

// Load from environment variable (or .env.local if using dotenv)
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ Error: API key not found!");
  console.error("Please set NEXT_PUBLIC_GEMINI_API_KEY environment variable or use dotenv to load from .env.local");
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function checkModels() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error("❌ API Error:", data.error.message);
      return;
    }

    console.log("✅ Available Models for this Key:");
    // Filter for just the names to make it readable
    const models = data.models?.map(m => m.name.replace('models/', '')) || [];
    
    if (models.length === 0) {
        console.log("⚠️ No models found. Your key might be invalid or region-locked.");
    } else {
        console.log(models.join('\n'));
    }
    
  } catch (err) {
    console.error("Network Error:", err);
  }
}

checkModels();