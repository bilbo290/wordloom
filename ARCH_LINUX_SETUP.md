# Arch Linux Setup Guide for Wordloom

This guide addresses common issues when running Wordloom on Arch Linux.

## Common Issues & Solutions

### 1. esbuild Service Errors
**Error**: `Error: The service was stopped` when starting Vite

**Solutions Applied**:
- Added explicit `esbuild.target: 'es2020'` configuration
- Set `optimizeDeps.esbuildOptions.target: 'es2020'`
- Added `build.target: 'es2020'` for consistency

### 2. File Watching Issues
**Issue**: HMR (Hot Module Reload) not working or slow file detection

**Solutions Applied**:
- Enabled polling for file watching: `usePolling: true`
- Set polling interval to 1000ms
- Changed server host to `0.0.0.0` for better network compatibility

### 3. Monaco Editor Chunking
**Issue**: Large bundle sizes or loading issues with Monaco Editor

**Solutions Applied**:
- Added manual chunks for Monaco Editor in rollup config
- Separated Monaco Editor into its own chunk for better caching

## Installation Steps

1. **Clean Installation**:
   ```bash
   rm -rf node_modules bun.lockb
   bun install
   ```

2. **Environment Setup**:
   Copy `.env.example` to `.env.local` and configure your AI providers:
   ```bash
   cp .env.example .env.local
   ```

3. **Start Development Server**:
   ```bash
   bun run dev
   ```

## System Requirements

- **Bun**: Latest stable version (1.1.42+)
- **Node.js**: 18+ (for compatibility with esbuild)
- **RAM**: 2GB+ recommended for Monaco Editor compilation

## Performance Tips

1. **Increase File Watch Limits** (if you get ENOSPC errors):
   ```bash
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. **Use Local Network Access**:
   The server binds to `0.0.0.0:5173`, accessible via:
   - `http://localhost:5173`
   - `http://[your-ip]:5173`

## Troubleshooting

### Build Fails with TypeScript Errors
- Ensure TypeScript version compatibility
- Clear TypeScript cache: `rm -rf .tsbuildinfo`

### Monaco Editor Loading Issues
- Check browser console for WebAssembly errors
- Ensure modern browser with ES2020 support

### Network/Proxy Issues
- LM Studio: Verify `http://127.0.0.1:1234/v1` is accessible
- Ollama: Verify `http://127.0.0.1:11434/v1` is accessible
- Use proxy endpoints `/v1/*` or `/ollama/*` if direct access fails

### Performance Issues
- Monitor memory usage during development
- Consider using `bun run build && bun run preview` for testing production builds
- Disable unnecessary browser extensions

## Configuration Files

Key configuration changes made for Arch Linux compatibility:

### vite.config.ts
- Added polling-based file watching
- Configured esbuild target consistency
- Added Monaco Editor chunking
- Set server host to `0.0.0.0`

### tsconfig.node.json  
- Added `esModuleInterop: true`
- Set `target: "ES2020"`

These changes ensure compatibility while maintaining performance on Arch Linux systems.