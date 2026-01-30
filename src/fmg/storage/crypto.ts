/**
 * Crypto utilities for secure token storage
 * Uses Web Crypto API with AES-GCM encryption
 * Key derived from extension-specific browser fingerprint
 */

export interface EncryptedData {
    iv: string;
    data: string;
    version: number;
}

export class FMG_Crypto {
    private static readonly ALGORITHM = "AES-GCM";
    private static readonly KEY_LENGTH = 256;
    private static readonly IV_LENGTH = 12;
    private static readonly VERSION = 1;
    private static readonly SALT = "fmg-sync-token-v1";

    /**
     * Derives encryption key from extension ID and browser fingerprint
     * This creates a unique key per extension installation
     */
    private static async deriveKey(): Promise<CryptoKey> {
        const extensionId = chrome.runtime.id || "fmg-default-id";
        const fingerprint = this.getBrowserFingerprint();
        const keyMaterial = `${extensionId}:${fingerprint}:${this.SALT}`;

        const encoder = new TextEncoder();
        const keyData = encoder.encode(keyMaterial);

        // Use PBKDF2-like approach with SHA-256
        const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);

        return await crypto.subtle.importKey(
            "raw",
            hashBuffer,
            { name: this.ALGORITHM },
            false,
            ["encrypt", "decrypt"]
        );
    }

    /**
     * Gets browser fingerprint for key derivation
     * Combines stable browser characteristics
     */
    private static getBrowserFingerprint(): string {
        const components = [
            navigator.userAgent,
            navigator.language,
            navigator.hardwareConcurrency?.toString() || "0",
            screen.colorDepth?.toString() || "24",
            screen.width.toString(),
            screen.height.toString(),
            Intl.DateTimeFormat().resolvedOptions().timeZone
        ];
        return components.join("|");
    }

    /**
     * Generates random IV for encryption
     */
    private static generateIV(): Uint8Array {
        return crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    }

    /**
     * Encrypts plaintext string
     * @param plaintext The string to encrypt
     * @returns Encrypted data object with IV and ciphertext
     */
    public static async encrypt(plaintext: string): Promise<EncryptedData> {
        const key = await this.deriveKey();
        const iv = this.generateIV();
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);

        const ciphertext = await crypto.subtle.encrypt(
            { name: this.ALGORITHM, iv: iv as BufferSource },
            key,
            data
        );

        return {
            iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
            data: this.arrayBufferToBase64(ciphertext),
            version: this.VERSION
        };
    }

    /**
     * Decrypts encrypted data
     * @param encrypted The encrypted data object
     * @returns Decrypted plaintext string
     */
    public static async decrypt(encrypted: EncryptedData): Promise<string> {
        const key = await this.deriveKey();
        const iv = this.base64ToUint8Array(encrypted.iv);
        const ciphertext = this.base64ToUint8Array(encrypted.data);

        const decrypted = await crypto.subtle.decrypt(
            { name: this.ALGORITHM, iv: iv as BufferSource },
            key,
            ciphertext as BufferSource
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }

    /**
     * Checks if data appears to be encrypted (has encrypted format)
     * @param data The data to check
     * @returns true if encrypted, false if plaintext
     */
    public static isEncrypted(data: string): boolean {
        try {
            const parsed = JSON.parse(data) as EncryptedData;
            return (
                typeof parsed.iv === "string" &&
                typeof parsed.data === "string" &&
                typeof parsed.version === "number"
            );
        } catch {
            return false;
        }
    }

    /**
     * Encrypts plaintext if not already encrypted
     * @param data The data to encrypt (plaintext or already encrypted)
     * @returns Encrypted data string (JSON)
     */
    public static async encryptIfNeeded(data: string): Promise<string> {
        if (this.isEncrypted(data)) {
            return data;
        }
        const encrypted = await this.encrypt(data);
        return JSON.stringify(encrypted);
    }

    /**
     * Decrypts data if encrypted, returns as-is if plaintext
     * @param data The data to decrypt (encrypted JSON or plaintext)
     * @returns Decrypted plaintext
     */
    public static async decryptIfNeeded(data: string): Promise<string> {
        if (!this.isEncrypted(data)) {
            return data;
        }
        const parsed = JSON.parse(data) as EncryptedData;
        return await this.decrypt(parsed);
    }

    /**
     * Converts ArrayBuffer to base64 string
     */
    private static arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Converts base64 string to Uint8Array
     */
    private static base64ToUint8Array(base64: string): Uint8Array {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
}
