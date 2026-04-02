document.addEventListener("DOMContentLoaded", () => {
  const summarizeBtn = document.getElementById("summarizeBtn");
  const fillFormBtn = document.getElementById("fillFormBtn");
  const userIdInput = document.getElementById("userId");
  const statusEl = document.getElementById("status");

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.style.color = isError ? "#dc2626" : "#059669";
    setTimeout(() => { statusEl.textContent = ""; }, 3000);
  }

  // --- 1. Summarize Page Context ---
  summarizeBtn.addEventListener("click", async () => {
    const userId = userIdInput.value.trim();
    if (!userId) return setStatus("Please enter User ID.", true);

    summarizeBtn.disabled = true;
    summarizeBtn.textContent = "Extracting...";

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractPageData,
      });

      const pageData = injectionResults[0].result;
      
      summarizeBtn.textContent = "Sending...";
      
      const payload = {
        userId: userId,
        text: pageData.text,
        inputs: pageData.inputs,
        buttons: pageData.buttons
      };

      const res = await fetch("https://iprq-hackathonadvaya.hf.space/api/analyze-webpage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Backend response not OK");

      setStatus("Sent to FastAPI!");
    } catch (err) {
      console.error(err);
      setStatus("Failed to analyze page.", true);
    } finally {
      summarizeBtn.disabled = false;
      summarizeBtn.textContent = "Summarize Page Context";
    }
  });

  // --- 2. Auto-fill Forms ---
  fillFormBtn.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: autoFillForms,
      });
      setStatus("Forms auto-filled!");
    } catch (err) {
      setStatus("Failed to fill forms.", true);
    }
  });
});

// ------------------------------------------------------------------
// Injected Scripts (These run in the context of the webpage)
// ------------------------------------------------------------------

function extractPageData() {
  const text = document.body.innerText;
  
  const inputs = Array.from(document.querySelectorAll("input, textarea")).map(el => ({
    name: el.name || "",
    type: el.type || "text",
    placeholder: el.placeholder || ""
  }));

  const buttons = Array.from(document.querySelectorAll("button")).map(el => el.innerText.trim()).filter(t => t);

  return { text, inputs, buttons };
}

function autoFillForms() {
  const inputs = document.querySelectorAll("input, textarea");
  let filledCount = 0;

  inputs.forEach(input => {
    const nameStr = (input.name || input.id || "").toLowerCase();
    const typeStr = (input.type || "").toLowerCase();

    if (nameStr.includes("name")) {
      input.value = "Neeraj";
      filledCount++;
      // Trigger change event for modern frameworks
      input.dispatchEvent(new Event("input", { bubbles: true })); 
    } else if (typeStr === "email" || nameStr.includes("email")) {
      input.value = "test@gmail.com";
      filledCount++;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  console.log(`AutoFill complete: filled ${filledCount} field(s).`);
}
