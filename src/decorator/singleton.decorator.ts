/**
 * Singleton decorator that ensures only one instance of a class is created
 */
export function Singleton<T extends { new (...args: any[]): {} }>(constructor: T) {
    let instance: T;
    
    const singletonClass = class extends constructor {
        constructor(...args: any[]) {
            if (instance) {
                return instance;
            }
            super(...args);
            instance = this as any;
            return instance;
        }
    };

    // Preserve the original constructor name
    Object.defineProperty(singletonClass, 'name', {
        value: constructor.name,
        configurable: true
    });

    return singletonClass as T;
}
