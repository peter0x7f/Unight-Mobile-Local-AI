/**
 * Model Configuration
 * Extracted from src/services/LocalModelService.js
 */

module.exports = {
    // Ollama models (shared container, HTTP)
    ollama: {
        'tinyllama-1.1b': { ollama: 'tinyllama:1.1b', max_tokens: 512 },
        'qwen3-4b': { ollama: 'qwen3:4b', max_tokens: 2048 },
        'deepseek-r1-8b': { ollama: 'deepseek-r1:8b', max_tokens: 512, force_english: true },
        'gemma3-12b': { ollama: 'gemma3:12b', max_tokens: 2048 },
        'llama3.2-latest': { ollama: 'llama3.2:latest', max_tokens: 2048 },
        'llama3.2-1b': { ollama: 'llama3.2:1b', max_tokens: 512 }
    }
};
