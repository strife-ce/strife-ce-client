import { AuthenticationService } from 'app/data/services';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-full-layout',
  templateUrl: './full.component.html',
  styleUrls: ['./full.component.scss']
})
export class FullComponent implements OnInit {
  constructor(public router: Router, private authenticationService: AuthenticationService) {}

  ngOnInit() {
    if (this.router.url === '/') {
      this.router.navigate(['/dashboard']);
    }
  }

  public logout() {
    this.authenticationService.logout();
    this.router.navigate(['/login']);
  }
}
