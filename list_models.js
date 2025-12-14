// Run with: node list_models.js
// Make sure to replace YOUR_KEY below
const apiKey = "AIzaSyA0TX4vCYnrHG5v26498An0dYFnjn27iN4"; 
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