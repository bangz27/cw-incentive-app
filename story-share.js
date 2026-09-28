(function () {
  const native = window.Capacitor?.registerPlugin?.('StoryShare');
  window.TBSStoryShare = {
    async saveImage(base64, filename) {
      if (native?.saveImage) return native.saveImage({ base64, filename });
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${base64}`;
      link.download = filename;
      link.click();
      return { ok: true, fallback: true };
    },
    async shareImage(base64, filename, text) {
      if (native?.shareImage) return native.shareImage({ base64, filename, text });
      const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], text: text || 'TBS Incentive' });
        return { ok: true, fallback: true };
      }
      await this.saveImage(base64, filename);
      return { ok: true, fallback: true };
    }
  };
})();
