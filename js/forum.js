// Updated Tenor URL embedding logic

function embedTenorUrl(url) {
    const tenorBaseUrl = 'https://tenor.com/view/';
    // Check if the URL is a Tenor URL
    if (url.includes(tenorBaseUrl)) {
        return `<iframe src='${url}' width='480' height='270' frameborder='0' allowfullscreen></iframe>`;
    }
    return url;
}

// Other fixes and enhancements can be added here