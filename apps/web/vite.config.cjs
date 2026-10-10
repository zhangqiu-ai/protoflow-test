
// Keep the built React renderer usable over file://, including in Electron.
module.exports = {
  base: './',
  build: { modulePreload: false },
  plugins: [{
    name: 'inline-local-renderer',
    enforce: 'post',
    generateBundle: {
      order: 'post',
      handler(_, bundle) {
        const html = bundle['index.html'];
        if (!html) throw new Error('Vite did not emit index.html');
        html.source = String(html.source)
          .replace(/<script\b[^>]*src="\.\/([^\"]+)"[^>]*><\/script>/g, (_, asset) => {
            const chunk = bundle[asset];
            if (!chunk || chunk.type !== 'chunk') throw new Error(`Missing renderer: ${asset}`);
            return `<script type="module">${chunk.code.replace(/<\/script/gi, '<\\/script')}</script>`;
          })
          .replace(/<link\b[^>]*href="\.\/([^\"]+\.css)"[^>]*>/g, (_, asset) => {
            const css = bundle[asset];
            if (!css || css.type !== 'asset') throw new Error(`Missing styles: ${asset}`);
            return `<style>${css.source}</style>`;
          });
      }
    }
  }]
};
