chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    const url = new URL(details.url);
    const fullDomain = url.hostname;
    const mainDomain = getMainDomain(fullDomain);
    updateblacklist()
   
  
    // Check local blacklist
    chrome.storage.local.get(['standardBlockedSites'], function (sitess){
    chrome.storage.local.get(['yourBlockedSites'], function (sites) {
      chrome.storage.local.get(['enabled'], function(result) {
        const enabled = result.enabled;
        if (enabled){
          const localBlacklist = sites.yourBlockedSites || [];
          const publicBlacklist = sitess.standardBlockedSites || [];
          if (localBlacklist.includes(fullDomain) || localBlacklist.includes(mainDomain)||publicBlacklist.includes(fullDomain) || publicBlacklist.includes(mainDomain)) {
              // Redirect to warning page
              const warningUrl = chrome.runtime.getURL(`warning.html?url=${encodeURIComponent(details.url)}`);
              chrome.tabs.update(details.tabId, { url: warningUrl });
          }
        }
        
      });    
    });  
    });
});
  
async function updateblacklist() {
  const publicblacklist = await requestApi();
  chrome.storage.local.set({'standardBlockedSites':publicblacklist.sites})
}

async function requestApi() {
  return await fetch('http://localhost:333/get_sitelist', {
      method: 'get',
      headers: {
          'Content-Type': 'application/json'
      },
  })
  .then(response => {
      if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
  })
  .catch(error => {
      console.error('Error:', error);
      throw error; // Re-throw the error to maintain consistent error handling
  });
}


  // Function to get the main domain (without subdomains)
  function getMainDomain(domain) {
    const parts = domain.split('.');
    if (parts.length > 2) {
      return parts.slice(1).join('.');
    } else {
      return domain;
    }
  }
 

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    const url = new URL(details.url);
    // Check if the URL is on mail.google.com
    if (url.hostname === 'mail.google.com') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'addButton' });
      });
    }
  
});


chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === "install") {
    chrome.storage.local.set({ 'enabled': true });
    var harmfulFileTypes = ['.exe', '.bat', '.cmd', '.js', '.vbs', '.ps1', '.jar', '.msi', '.dll', '.scr'];
    chrome.storage.local.set({'extensiontypes': harmfulFileTypes})
    chrome.tabs.create({url: chrome.runtime.getURL('thankyou.html')});
  }
  else if (details.reason === "update"){
    //var harmfulFileTypes = ['.exe', '.bat', '.cmd', '.js', '.vbs', '.ps1', '.jar', '.msi', '.dll', '.scr'];
    //chrome.storage.local.set({'extensiontypes': harmfulFileTypes})
  }
});

chrome.downloads.onChanged.addListener(function (item) {
  chrome.storage.local.get(['enabled'], function(result) {
    chrome.storage.local.get(['extensiontypes'], function(results) {
    const enabled = result.enabled;
    const harmfulFileTypes = results.extensiontypes;
    if (enabled){
      for (var i = 0; i < harmfulFileTypes.length; i++) {
          var filetype = harmfulFileTypes[i];

          // Check if the file extension is in the list or if it has an LRM in the name
          if (item.filename.current.endsWith(filetype) || item.filename.current.includes('\u200E')) {
              // Pause download and show download popup
              showDownloadPopup(item);
              chrome.downloads.pause(item.id);
              break;
          }
      }
    }});
    });
});

function showDownloadPopup(item) {
  // Create a new window for the download popup
  chrome.windows.create({
      url: chrome.runtime.getURL('downloadpopup.html'),
      type: 'popup',
      width: 400,
      height: 300
  }, function (window) {
      // Wait for the window to finish loading before sending the message
      chrome.tabs.onUpdated.addListener(function onUpdated(tabId, changeInfo) {
          if (tabId === window.tabs[0].id && changeInfo.status === 'complete') {
              // Send message to the popup window
              chrome.tabs.sendMessage(tabId, {
                  filename: item.filename.current,
                  reason: item.filename.current.includes('\u200E') ? 'LRM' : item.filename.current.split('.').pop(),
                  downloadId: item.id
              });

              // Remove the listener after sending the message
              chrome.tabs.onUpdated.removeListener(onUpdated);
          }
      });
  });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'showErrorPopup') {
    // Open the popup
    chrome.windows.create({
      url: chrome.runtime.getURL('gmailerror.html'),
      type: 'popup',
      width: 400,
      height: 300
  });
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'showPopupWithData') {
      const data = request.data;
      // Process the data as needed and show the popup
      showPopupWithData(data);
  } else if (request.action === 'showErrorPopup') {
      // Handle showing the error popup
      showErrorPopup();
  }
});

function showPopupWithData(data) {
  chrome.windows.create({
    url: chrome.runtime.getURL('aipopup.html'),
    type: 'popup',
    width: 289,
    height: 255
}, function (window) {
    // Wait for the window to finish loading before sending the message
    chrome.tabs.onUpdated.addListener(function onUpdated(tabId, changeInfo) {
        if (tabId === window.tabs[0].id && changeInfo.status === 'complete') {
            // Send message to the popup window
            chrome.tabs.sendMessage(tabId, {
                class: data.a,
                percentage: data.b,
            });

            // Remove the listener after sending the message
            chrome.tabs.onUpdated.removeListener(onUpdated);
        }
    });
});
}

