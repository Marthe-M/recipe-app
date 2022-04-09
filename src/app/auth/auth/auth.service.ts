import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, tap } from "rxjs/operators";
import { throwError } from 'rxjs'
import { User } from "./user.model";
import { Router } from "@angular/router";
import { Store } from "@ngrx/store";
import * as fromApp from '../../store/app.reducer'
import * as AuthActions from "./store/auth.actions";
import { environment } from '../../../environments/environment'

interface AuthResponseData {
    idToken: string,
    email: string,
    refreshToken: string,
    expiresIn: string,
    localId: string,
    registered?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

    private tokenExpirationTimer: any

    constructor(private http: HttpClient, private router: Router, private store: Store<fromApp.AppState>) { }

    signup(email: string, password: string) {
        return this.http.post<AuthResponseData>('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + environment.firebaseAPIkey,
            { email: email, password: password, returnSecureToken: true }).pipe(catchError(this.handleError), tap(resData => {
                const expirationDate = new Date(new Date().getTime() + +resData.expiresIn * 1000)
                const user = new User(resData.email, resData.localId, resData.idToken, expirationDate)
                this.store.dispatch(new AuthActions.Login({ email: user.email, id: user.id, token: user.token, expirationDate: expirationDate }))
                localStorage.setItem('userData', JSON.stringify(user))
            }))
    }
    login(email: string, password: string) {
        return this.http.post<AuthResponseData>('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + environment.firebaseAPIkey,
            { email: email, password: password, returnSecureToken: true }).pipe(catchError(this.handleError), tap(resData => {
                const expirationDate = new Date(new Date().getTime() + +resData.expiresIn * 1000)
                const user = new User(resData.email, resData.localId, resData.idToken, expirationDate)
                this.store.dispatch(new AuthActions.Login({ email: user.email, id: user.id, token: user.token, expirationDate: expirationDate }))
                localStorage.setItem('userData', JSON.stringify(user))
            }))
    }

    autoLogin() {
        const userData: {
            email: string,
            id: string,
            _token: string,
            _tokenExpirationDate: string
        } = JSON.parse(localStorage.getItem('userData'))
        if (!userData) {
            return
        }
        const loadedUser = new User(userData.email, userData.id, userData._token, new Date(userData._tokenExpirationDate))
        if (loadedUser.token) {
            this.store.dispatch(new AuthActions.Login({ email: loadedUser.email, id: loadedUser.id, token: loadedUser.token, expirationDate: new Date(userData._tokenExpirationDate) }))

        }
    }

    logout() {
        this.store.dispatch(new AuthActions.Logout())
        this.router.navigate(['/auth'])
        localStorage.removeItem('userData')
        if (this.tokenExpirationTimer) {
            clearTimeout(this.tokenExpirationTimer)
        }
        this.tokenExpirationTimer = null
    }


    private handleError(errorRes: HttpErrorResponse) {
        let errorMessage = 'An unknown error occurred!'
        if (!errorRes.error || !errorRes.error.error) {
            return throwError(errorMessage)
        }
        switch (errorRes.error.error.message) {
            case 'EMAIL_EXISTS':
                errorMessage = 'This email already exists'
                break;
            case 'EMAIL_NOT_FOUND':
                errorMessage = 'This email does not exist'
                break;
            case 'INVALID_PASSWORD':
                errorMessage = 'This password is not correct'
                break;
        }
        return throwError(errorMessage)
    }
}

