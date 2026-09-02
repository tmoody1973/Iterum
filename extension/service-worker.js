import { buildIterumClipUrl } from './clip-link.js'

const CLIP_IMAGE = 'iterum-clip-image'
const CLIP_PAGE = 'iterum-clip-page'

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: CLIP_IMAGE, title: 'Save image to Iterum', contexts: ['image'] })
    chrome.contextMenus.create({ id: CLIP_PAGE, title: 'Save page to Iterum', contexts: ['page'] })
  })
})

function openClip({ sourceUrl, imageUrl, title }) {
  const url = buildIterumClipUrl({ sourceUrl, imageUrl, title })
  if (url) chrome.tabs.create({ url })
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CLIP_IMAGE && info.menuItemId !== CLIP_PAGE) return
  openClip({
    sourceUrl: info.pageUrl || tab?.url,
    imageUrl: info.menuItemId === CLIP_IMAGE ? info.srcUrl : undefined,
    title: tab?.title,
  })
})

chrome.action.onClicked.addListener((tab) => openClip({ sourceUrl: tab.url, title: tab.title }))
