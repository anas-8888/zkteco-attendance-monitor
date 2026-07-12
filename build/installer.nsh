!define MUI_ABORTWARNING

!define MUI_WELCOMEPAGE_TITLE "Install Nexa Attendance Monitor"
!define MUI_WELCOMEPAGE_TEXT "This setup will install Nexa Attendance Monitor on your computer.$\r$\n$\r$\nIf a previous version is already installed, it will be updated while keeping your attendance data.$\r$\n$\r$\nClick Next to continue."

!define MUI_FINISHPAGE_TITLE "Nexa Attendance Monitor Is Ready"
!define MUI_FINISHPAGE_TEXT "Setup has finished installing Nexa Attendance Monitor.$\r$\n$\r$\nClick Finish to launch the app."

!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend
