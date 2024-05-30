chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ imageUrl: '' }, () => {
      console.log('The default image URL is set.');
    });
});
