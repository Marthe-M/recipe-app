export class User {
    id: string
    constructor(
        public email: string,
        id: string,
        private _token: string,
        private _tokenExipirationDate: Date) { }
    get token() {
        if (!this._tokenExipirationDate || new Date() > this._tokenExipirationDate) {
            return null
        }
        return this._token
    }
}