// Initialize jquery-bracket
import $ from 'jquery';

// Hack to make jQuery available globally for jquery-bracket
window.jQuery = window.$ = $;

// Create a function to load bracket assets
export async function loadBracketAssets() {
  // Track loading status
  let jsLoaded = false;
  let cssLoaded = false;

  // Helper to inject CSS
  function injectCSS(url) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = url;
      link.onload = () => resolve(true);
      link.onerror = () => reject(new Error(`Failed to load CSS: ${url}`));
      document.head.appendChild(link);
    });
  }

  try {
    // Load both resources in parallel
    const [jsResult, cssResult] = await Promise.allSettled([
      // Load the JS (we need to use a more reliable approach)
      import(/* @vite-ignore */ '/node_modules/jquery-bracket/dist/jquery.bracket.min.js')
        .catch(() => {
          // Fallback to using a direct URL if the node_modules path doesn't work
          const script = document.createElement('script');
          script.src = '/assets/jquery.bracket.min.js'; // Assuming you've copied it to public/assets
          return new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }),
      
      // Load the CSS
      injectCSS('/node_modules/jquery-bracket/dist/jquery.bracket.min.css')
        .catch(() => injectCSS('/assets/jquery.bracket.min.css'))
    ]);

    jsLoaded = jsResult.status === 'fulfilled';
    cssLoaded = cssResult.status === 'fulfilled';

    console.log(`jquery-bracket loaded: JS ${jsLoaded ? 'success' : 'failed'}, CSS ${cssLoaded ? 'success' : 'failed'}`);
    
    // Return overall success
    return jsLoaded && cssLoaded;
  } catch (error) {
    console.error('Failed to load jquery-bracket:', error);
    return false;
  }
}

// Call the load function immediately
const bracketLoadPromise = loadBracketAssets();

// Export a utility function to check if jquery-bracket is properly loaded
export function isBracketLoaded() {
  return typeof $.fn.bracket === 'function';
}

// Export a utility function to initialize a bracket with better error handling
export async function initializeBracket(selector, data, options = {}) {
  // Wait for bracket to load first
  await bracketLoadPromise;
  
  if (!isBracketLoaded()) {
    console.error('jquery-bracket is not loaded properly');
    return false;
  }
  
  try {
    // Clean the container first
    $(selector).empty();
    
    // Initialize the bracket
    $(selector).bracket({
      init: data,
      ...options
    });
    return true;
  } catch (error) {
    console.error('Error initializing bracket:', error);
    return false;
  }
} 