import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { io } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';
import './InteractiveTerminal.css';

const EXECUTION_SERVICE_URL = import.meta.env.VITE_EXECUTION_SERVICE_URL;

/**
 * A live terminal for the Run tab. Connects to the execution microservice,
 * kicks off one run, and streams stdin/stdout both ways in real time —
 * the program can print a prompt and wait, exactly like a real terminal.
 *
 * Mount this fresh (e.g. `key={runId}`) each time the user clicks Run, so
 * a new run always gets a clean terminal + a clean socket connection.
 */
export default function InteractiveTerminal({ language, code, token, onExit, onError }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontSize: 14,
      theme: { background: '#0d1117', foreground: '#c9d1d9' },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();
const socket = io(EXECUTION_SERVICE_URL, {
  auth: { token },
  extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
  transports: ['polling'],
  reconnection: false, // add this — a dropped run shouldn't silently reconnect and start a second session
});

    socket.on('connect_error', (err) => {
      term.writeln(`\r\n[connection error: ${err.message}]`);
    });
    socket.on('status', ({ state }) => {
      if (state === 'starting') term.writeln('[starting session...]\r\n');
    });
    socket.on('output', ({ data }) => term.write(data));
    socket.on('error', ({ message }) => term.writeln(`\r\n[${message}]`));
    socket.on('exit', ({ code: exitCode }) =>
      term.writeln(`\r\n[process exited with code ${exitCode}]`)
    );
    socket.on('output', ({ data }) => term.write(data));
    socket.on('error', ({ message }) => {
      term.writeln(`\r\n[${message}]`);
      if (onError) onError(message);
    });
    socket.on('exit', ({ code: exitCode }) => {
      term.writeln(`\r\n[process exited with code ${exitCode}]`);
      if (onExit) onExit(exitCode);
    });
    socket.emit('run', { language, code });

    // Basic line-buffered local echo: the container's programs read stdin
    // line by line (scanf/input()/Scanner), so we buffer keystrokes and
    // only send on Enter, same as a normal terminal in canonical mode.
    let inputBuffer = '';
    term.onData((data) => {
      if (data === '\r') {
        socket.emit('input', inputBuffer + '\n');
        inputBuffer = '';
        term.write('\r\n');
      } else if (data === '\u007F') {
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          term.write('\b \b');
        }
      } else {
        inputBuffer += data;
        term.write(data);
      }
    });
    
    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.disconnect();
      term.dispose();
    };
    // Intentionally runs once per mount — parent should remount (key change)
    // to start a fresh run rather than this effect re-running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  

  return <div className="interactive-terminal" ref={containerRef} />;
}