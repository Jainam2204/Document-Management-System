import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class GetCookieService {

    getCookie(name: string): string | null {
        try {
            let cookies = document.cookie.split("; ");
            for (let cooky of cookies) {
                let [key, value] = cooky.split("=");
                if (key === name) {
                    return value
                };
            }
            return null;
        } catch (error) {
            console.error("Error in getting cookie from cookies : " + error);
            return null;
        }
    }
}
