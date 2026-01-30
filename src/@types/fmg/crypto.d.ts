declare namespace FMG {
    namespace Crypto {
        interface EncryptedData {
            iv: string;
            data: string;
            version: number;
        }
    }
}
