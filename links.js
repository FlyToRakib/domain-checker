// links.js - Centralized configuration for all outbound links
// Update URLs here to change them across the entire extension without touching HTML.

const APP_LINKS = {
  degirdHome: "https://degird.com",
  degirdProducts: "https://degird.com/products#extensions",
  reviewUs: "https://chromewebstore.google.com/detail/domain-availability-check/njigomaphabombidlgemlkgebnflhkgp/reviews",
  moreTools: "https://chromewebstore.google.com/search/degird",
  privacy: "https://docs.google.com/document/d/1cIj2sJP_ajgFfz4jVIKW7IZbifFWWxoKMat5dRiFI3s/edit?usp=sharing",
  support: "https://degird.com/support",
  apiDocGuide: "https://wpinlearn.com/google-ai-studio-api-key"
};

function initDynamicLinks() {
  document.querySelectorAll('[data-link]').forEach(el => {
    const linkKey = el.getAttribute('data-link');
    if (APP_LINKS[linkKey]) {
      el.href = APP_LINKS[linkKey];
    }
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDynamicLinks);
  } else {
    initDynamicLinks();
  }
}
