chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({
        active: true,
        url: chrome.runtime.getURL("extension.html")
    })
})