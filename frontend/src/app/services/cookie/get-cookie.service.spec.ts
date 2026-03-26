import { TestBed } from '@angular/core/testing';

import { GetCookieService } from './get-cookie.service';

describe('GetCookieService', () => {
  let service: GetCookieService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GetCookieService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
