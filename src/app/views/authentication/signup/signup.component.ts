import { AuthenticationService } from 'app/data/services';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { User, Account } from '@app/data/models';
import { ToastrService } from 'ngx-toastr';

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
    private authenticationService: AuthenticationService,
    private toastrService: ToastrService
  ) {
    this.createForm();
  }

  ngOnInit() { }

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

      await (user as any).signUp();
      user.account = new Account();
      user.account.name = this.signupForm.value.accountname;
      await user.account.save();
      await user.save();
      this.authenticationService.logout();
      this.router.navigate(['/login']);
      this.toastrService.success('account created successfully');
    } catch (error) {
      this.toastrService.error(error.message);
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
