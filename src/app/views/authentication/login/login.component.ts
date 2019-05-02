import { ToastrService } from 'ngx-toastr';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { finalize } from 'rxjs/operators';
import { AuthenticationService } from '@app/data/services';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  resetPasswordForm: FormGroup;
  isLoading = false;
  constructor(
    public router: Router,
    private formBuilder: FormBuilder,
    private authenticationService: AuthenticationService,
    private toastrService: ToastrService
  ) {
    this.createForm();
  }

  ngOnInit() { }

  login() {
    this.isLoading = true;
    this.authenticationService
      .login(this.loginForm.value.username, this.loginForm.value.password)
      .then(user => {
        this.isLoading = false;
        this.router.navigate(['/'], {
          replaceUrl: true
        });
      })
      .catch(err => {
        this.isLoading = false;
        this.toastrService.error((err instanceof Error) ? err.message : err);
      });
  }

  private createForm() {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
    this.resetPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }
}
