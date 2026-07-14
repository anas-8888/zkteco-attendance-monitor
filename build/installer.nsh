!include LogicLib.nsh
!include nsDialogs.nsh
!define MUI_ABORTWARNING

!define MUI_WELCOMEPAGE_TITLE "Install Nexa Attendance Monitor"
!define MUI_WELCOMEPAGE_TEXT "This setup will install Nexa Attendance Monitor on your computer.$\r$\n$\r$\nIf a previous version is already installed, it will be updated while keeping your attendance data.$\r$\n$\r$\nClick Next to continue."

!define MUI_FINISHPAGE_TITLE "Nexa Attendance Monitor Is Ready"
!define MUI_FINISHPAGE_TEXT "Setup has finished installing Nexa Attendance Monitor.$\r$\n$\r$\nClick Finish to launch the app."

!ifndef BUILD_UNINSTALLER
!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend

Var SetupAccountUsername
Var SetupAccountPassword
Var SetupAccountPasswordConfirm
Var SetupAccountUsernameInput
Var SetupAccountPasswordInput
Var SetupAccountPasswordConfirmInput
Var SetupAccountPageCompleted
Var SetupInitializationStatusFile
Var SetupExistingInstallation
Var SetupExistingInitialized

!define NEXA_INSTALLER_DATA_DIR "$APPDATA\nexa-attendance-monitor"
!define NEXA_INITIALIZED_FLAG "${NEXA_INSTALLER_DATA_DIR}\initialized.flag"

!macro customInit
  StrCpy $SetupExistingInstallation "0"
  StrCpy $SetupExistingInitialized "0"

  ReadRegStr $0 HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
  ${If} $0 != ""
    StrCpy $SetupExistingInstallation "1"
  ${EndIf}

  ReadRegStr $0 HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
  ${If} $0 != ""
    StrCpy $SetupExistingInstallation "1"
  ${EndIf}

  ${If} ${FileExists} "${NEXA_INITIALIZED_FLAG}"
    StrCpy $SetupExistingInitialized "1"
  ${EndIf}
!macroend

!macro customPageAfterChangeDir
  Page custom SetupAccountPageCreate SetupAccountPageLeave
!macroend

Function SetupAccountPageCreate
  ${If} $SetupExistingInitialized == "1"
    Abort
  ${EndIf}

  StrCpy $SetupAccountPageCompleted "0"

  nsDialogs::Create 1018
  Pop $0

  ${NSD_CreateLabel} 0u 0u 100% 16u "Create administrator account"
  Pop $0

  ${NSD_CreateLabel} 0u 18u 100% 20u "This administrator account will be created before the application opens for the first time. Setup cannot continue until this step is valid."
  Pop $0

  ${NSD_CreateLabel} 0u 42u 100% 12u "Username"
  Pop $0
  ${NSD_CreateText} 0u 54u 100% 14u "$SetupAccountUsername"
  Pop $SetupAccountUsernameInput

  ${NSD_CreateLabel} 0u 76u 100% 12u "Password"
  Pop $0
  ${NSD_CreatePassword} 0u 88u 100% 14u "$SetupAccountPassword"
  Pop $SetupAccountPasswordInput

  ${NSD_CreateLabel} 0u 110u 100% 12u "Confirm Password"
  Pop $0
  ${NSD_CreatePassword} 0u 122u 100% 14u "$SetupAccountPasswordConfirm"
  Pop $SetupAccountPasswordConfirmInput

  ${NSD_CreateLabel} 0u 144u 100% 20u "Choose any password you want. Only the confirmation must match."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function SetupAccountPageLeave
  ${NSD_GetText} $SetupAccountUsernameInput $SetupAccountUsername
  ${NSD_GetText} $SetupAccountPasswordInput $SetupAccountPassword
  ${NSD_GetText} $SetupAccountPasswordConfirmInput $SetupAccountPasswordConfirm

  ${If} $SetupAccountUsername == ""
    MessageBox MB_OK|MB_ICONEXCLAMATION "Enter a username to continue."
    Abort
  ${EndIf}

  ${If} $SetupAccountPassword == ""
    MessageBox MB_OK|MB_ICONEXCLAMATION "Enter a password to continue."
    Abort
  ${EndIf}

  ${If} $SetupAccountPassword != $SetupAccountPasswordConfirm
    MessageBox MB_OK|MB_ICONEXCLAMATION "The password confirmation does not match."
    Abort
  ${EndIf}

  StrCpy $SetupAccountPageCompleted "1"
FunctionEnd

!macro customInstall
  ${If} $SetupExistingInitialized != "1"
    ${IfNot} ${Silent}
      ${If} $SetupAccountPageCompleted != "1"
        MessageBox MB_OK|MB_ICONSTOP "Create the administrator account before installation can continue."
        Abort
      ${EndIf}
    ${EndIf}

    StrCpy $SetupInitializationStatusFile "$PLUGINSDIR\installer-initialization-status.ini"
    Delete "$SetupInitializationStatusFile"

    System::Call 'Kernel32::SetEnvironmentVariable(t, t)i("NEXA_INSTALLER_USERNAME", "$SetupAccountUsername").r0'
    System::Call 'Kernel32::SetEnvironmentVariable(t, t)i("NEXA_INSTALLER_PASSWORD", "$SetupAccountPassword").r0'
    System::Call 'Kernel32::SetEnvironmentVariable(t, t)i("NEXA_INSTALLER_PASSWORD_CONFIRMATION", "$SetupAccountPasswordConfirm").r0'
    System::Call 'Kernel32::SetEnvironmentVariable(t, t)i("NEXA_INSTALLER_STATUS_FILE", "$SetupInitializationStatusFile").r0'

    ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --initialize' $0

    System::Call 'Kernel32::SetEnvironmentVariable(t, t)i("NEXA_INSTALLER_USERNAME", "").r0'
    System::Call 'Kernel32::SetEnvironmentVariable(t, t)i("NEXA_INSTALLER_PASSWORD", "").r0'
    System::Call 'Kernel32::SetEnvironmentVariable(t, t)i("NEXA_INSTALLER_PASSWORD_CONFIRMATION", "").r0'
    System::Call 'Kernel32::SetEnvironmentVariable(t, t)i("NEXA_INSTALLER_STATUS_FILE", "").r0'

    StrCpy $SetupAccountPassword ""
    StrCpy $SetupAccountPasswordConfirm ""

    ReadINIStr $1 "$SetupInitializationStatusFile" "Initialization" "success"
    ReadINIStr $2 "$SetupInitializationStatusFile" "Initialization" "message"
    Delete "$SetupInitializationStatusFile"

    ${If} $0 != 0
      ${If} $2 == ""
        StrCpy $2 "The application files were installed, but Laravel initialization failed. Run the installer again and verify the database is available."
      ${EndIf}

      MessageBox MB_OK|MB_ICONSTOP "$2"
      Abort
    ${EndIf}

    ${If} $1 != "1"
      ${If} $2 == ""
        StrCpy $2 "The application did not confirm a successful initialization."
      ${EndIf}

      MessageBox MB_OK|MB_ICONSTOP "$2"
      Abort
    ${EndIf}
  ${EndIf}
!macroend
!endif
