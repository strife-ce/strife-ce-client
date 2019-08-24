import { Component } from '@angular/core';

@Component({
  selector: 'app-blank-layout',
  templateUrl: './blank.component.html',
  styleUrls: []
})
export class BlankComponent {

  public closeWindow() {
    if (window && (window as any).process) {
      const { remote } = (<any>window).require('electron');
      const wnd = remote.getCurrentWindow();
      wnd.close();
    }
  }

  public minimizeWindow() {
    if (window && (window as any).process) {
      const { remote } = (<any>window).require('electron');
      const wnd = remote.getCurrentWindow();
      wnd.minimize();
    }
  }
}
