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
    },
    // HuggingFace models (Python agents, NATS)
    huggingface: {
        'flan-t5-large': {
            type: 'encdec',
            hf_repo: 'google/flan-t5-large',
            max_tokens: 256,
            core: 'Solona'
        },
        'apertus-8b': {
            type: 'causal',
            hf_repo: 'swiss-ai/Apertus-8B-Instruct-2509',
            max_tokens: 32768,
            device: 'cuda',
            core: 'Verra'
        },
        'kimi-k2': {
            type: 'causal',
            hf_repo: 'moonshotai/Kimi-K2-Instruct',
            max_tokens: 32768,
            device: 'cuda',
            trust_remote_code: true,
            core: 'Qyron'
        },
        'openhermes-2-mistral-7b': {
            type: 'causal',
            hf_repo: 'teknium/OpenHermes-2-Mistral-7B',
            max_tokens: 2048,
            device: 'cuda',
            core: 'Solona'
        }
    }
};
