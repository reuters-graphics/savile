import React, { useEffect, useRef } from 'react';
import { WebContainer } from '@webcontainer/api';
import { fetchImage, fetchPlaceholderImage, createImage } from './images';

import '@xterm/xterm/css/xterm.css';
import './styles.css';
import type { Terminal } from '@xterm/xterm';
import { getVirtualFs } from './fs';

// @ts-ignore
import FiresXS from './imgs/fires-xs.png?inline';
// @ts-ignore
import FiresSM from './imgs/fires-sm.png?inline';
// @ts-ignore
import FiresMD from './imgs/fires-md.png?inline';
// @ts-ignore
import FiresLG from './imgs/fires-lg.png?inline';
// @ts-ignore
import FiresXL from './imgs/fires-xl.png?inline';
// @ts-ignore
import Rockets from './imgs/rockets.jpg?inline';
// @ts-ignore
import Water from './imgs/water.jpg?inline';

function XtermWebContainer() {
  const terminalContainerRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    let terminalInstance: Terminal, processWriter: WritableStreamDefaultWriter<string>, webcontainerInstance: WebContainer;

    (async () => {
      const { Terminal } = await import('@xterm/xterm');
      const { Unicode11Addon } = await import('@xterm/addon-unicode11');
      const { FitAddon } = await import('@xterm/addon-fit');

      const unicode11Addon = new Unicode11Addon();
      const fitAddon = new FitAddon();
    
      terminalInstance = new Terminal({
        allowProposedApi: true,
        disableStdin: false,
        fontFamily: 'Fira Code, monospace',
        fontSize: 14,
        letterSpacing: 0,
        rows: 20,
        lineHeight: 1,
        cursorBlink: true,
        cursorStyle: 'block',
        rescaleOverlappingGlyphs: true,
      });

      terminalInstance.loadAddon(unicode11Addon);
      terminalInstance.loadAddon(fitAddon);
      terminalInstance.unicode.activeVersion = '11';
      fitAddon.fit();

      terminalInstance.open(terminalContainerRef.current);
      terminalInstance.writeln('👋 Loading demo ...');
    
      webcontainerInstance = await WebContainer.boot();
    
      const virtualFs = await getVirtualFs();
      await webcontainerInstance.mount(virtualFs);

      await webcontainerInstance.fs.mkdir('src/images/graphics', { recursive: true });
      await webcontainerInstance.fs.mkdir('src/images/photos', { recursive: true });

      function Uint8ArrayImg(inline: string) {
        const base64 = inline.split(',')[1];
        return Uint8Array.from(window.atob(base64), (v) => v.charCodeAt(0));
      }

      await webcontainerInstance.fs.writeFile('src/images/graphics/fire-xs.png', Uint8ArrayImg(FiresXS));
      await webcontainerInstance.fs.writeFile('src/images/graphics/fire-sm.png', Uint8ArrayImg(FiresSM));
      await webcontainerInstance.fs.writeFile('src/images/graphics/fire-md.png', Uint8ArrayImg(FiresMD));
      await webcontainerInstance.fs.writeFile('src/images/graphics/fire-lg.png', Uint8ArrayImg(FiresLG));
      await webcontainerInstance.fs.writeFile('src/images/graphics/fire-xl.png', Uint8ArrayImg(FiresXL));
      await webcontainerInstance.fs.writeFile('src/images/photos/rockets.jpg', Uint8ArrayImg(Rockets));
      await webcontainerInstance.fs.writeFile('src/images/photos/water.jpg', Uint8ArrayImg(Water));
      await webcontainerInstance.fs.writeFile('src/images/photos/person.jpg', (await fetchPlaceholderImage(1200, 600)));
      await webcontainerInstance.fs.writeFile('src/images/photos/landscape.jpg', (await fetchPlaceholderImage(4400, 1200)));
      await webcontainerInstance.fs.writeFile('src/images/photos/landscape-2.jpg', (await fetchPlaceholderImage(5400, 1600)));
      await webcontainerInstance.fs.writeFile('src/images/graphics/map-xs.png', (await createImage(400, 500, 'png')));
      await webcontainerInstance.fs.writeFile('src/images/graphics/map-sm.png', (await createImage(650, 800, 'png')));
      await webcontainerInstance.fs.writeFile('src/images/graphics/map-md.png', (await createImage(1200, 1800, 'png')));
      await webcontainerInstance.fs.writeFile('src/images/graphics/map-lg.png', (await createImage(2200, 3200, 'png')));

      const installProc = await webcontainerInstance.spawn('npm', ['install']);
      await installProc.exit;

      terminalInstance.focus();
      terminalInstance.clear();

      const cmdProc = await webcontainerInstance.spawn('node', ['index.js']);
    
      cmdProc.output.pipeTo(
        new WritableStream({
          write(data) {
            terminalInstance.write(data);
          },
        })
      );
    
      processWriter = cmdProc.input.getWriter();
      terminalInstance.onData((data) => {
        processWriter.write(data);
      });
      await cmdProc.exit;
    })();

    return () => {
      if (terminalInstance) terminalInstance.dispose();
      if (processWriter) processWriter.close();
      if (webcontainerInstance) webcontainerInstance.teardown();
    };
  }, []);

  return (
    <div
      className='not-content xterm-wrapper'
    >
      <div
        className="xterm-container"
        ref={terminalContainerRef}
      />
      
    </div>
  );
}

export default XtermWebContainer;
