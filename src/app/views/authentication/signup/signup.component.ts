import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '@app/core';
import { finalize } from 'rxjs/operators';
import { User } from '@app/data/models';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnInit {
  signupForm: FormGroup;
  isLoading = false;

  constructor(
    public router: Router,
    private formBuilder: FormBuilder,
    private authenticationService: AuthenticationService
  ) {
    this.createForm();
  }

  ngOnInit() {}

  async signup() {
    const user = new User();
    user.setUsername(this.signupForm.value.username);
    user.setEmail(this.signupForm.value.username);
    user.setPassword(this.signupForm.value.password);

    try {
      if (
        this.signupForm.value.password !== this.signupForm.value.passwordRepeat
      ) {
        throw new Error('passwords dont fit');
      }
      console.log(user);
      await (user as any).signUp();
      console.log(user);
    } catch (error) {
      console.warn(error);
    }
  }

  private createForm() {
    this.signupForm = this.formBuilder.group({
      accountname: ['', [Validators.required]],
      username: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      passwordRepeat: ['', [Validators.required]]
    });
  }
}
