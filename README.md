# ZKTeco Attendance Monitor

A minimal Laravel 12 attendance monitoring system for ZKTeco K Series fingerprint attendance devices such as the K40.

This project is intentionally small. It is not a full HR system and it does not manage employees, fingerprints, shifts, salaries, or permissions. Its only purpose is to connect to a ZKTeco device over TCP/IP, synchronize attendance logs, and display who checked in and who checked out.

## Features

- Direct TCP/IP connection to ZKTeco devices on port `4370`
- No dependency on the official ZKTeco attendance software
- Manual sync command: `php artisan attendance:sync`
- Scheduler-ready sync every minute
- Duplicate attendance log protection
- REST API for dashboard data
- Simple responsive monitoring dashboard
- Device online/offline status endpoint
- Clean service layer around device communication
- Environment-based device configuration

## Tech Stack

- PHP 8.2+
- Laravel 12
- MySQL or MariaDB
- Vite
- Tailwind CSS
- Open-source ZKTeco protocol package: `0mithun/php-zkteco`

## Requirements

Install these before running the project:

- PHP `8.2` or newer
- Composer
- Node.js and npm
- MySQL or MariaDB
- PHP extensions:
  - `sockets`
  - `pdo_mysql`
  - `mysqli`
  - `openssl`
  - `curl`
  - `fileinfo`
  - `mbstring`
  - `zip`

If you use XAMPP, make sure your XAMPP version includes PHP 8.2 or newer. Older XAMPP versions with PHP 8.0 will not run Laravel 12.

## Installation

Clone the repository:

```bash
git clone <your-repository-url>
cd ZKTeco
```

Install PHP dependencies:

```bash
composer install
```

Create the environment file:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Generate the Laravel application key:

```bash
php artisan key:generate
```

Install frontend dependencies and build assets:

```bash
npm install
npm run build
```

Create a database named:

```text
zkteco_monitor
```

Then run migrations:

```bash
php artisan migrate
```

## Environment Configuration

Open `.env` and configure the database:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=zkteco_monitor
DB_USERNAME=root
DB_PASSWORD=
```

Configure the ZKTeco device:

```env
ZKTECO_DEVICE_IP=192.168.1.201
ZKTECO_DEVICE_PORT=4370
ZKTECO_COMMUNICATION_PASSWORD=0
ZKTECO_PROTOCOL=tcp
ZKTECO_TIMEOUT=25
ZKTECO_SHOULD_PING=false
ATTENDANCE_POLLING_INTERVAL=60
```

Explanation:

- `ZKTECO_DEVICE_IP`: the IP address of the fingerprint device
- `ZKTECO_DEVICE_PORT`: the device communication port, usually `4370`
- `ZKTECO_COMMUNICATION_PASSWORD`: device communication password, usually `0` if not configured
- `ZKTECO_PROTOCOL`: keep this as `tcp`
- `ZKTECO_TIMEOUT`: connection timeout in seconds
- `ATTENDANCE_POLLING_INTERVAL`: minimum seconds between scheduled sync runs

## Connecting The Device

Connect the ZKTeco device to the same network as the server or laptop running this project. Use Ethernet/LAN, not USB.

Example device network settings:

```text
IP Address: 192.168.1.201
Subnet Mask: 255.255.255.0
Gateway: 192.168.1.1
Port: 4370
Comm Password: 0
```

On many ZKTeco K Series devices, these settings are under:

```text
Menu > Comm > Ethernet
```

Test the connection from the computer:

```bash
ping 192.168.1.201
```

If ping works, update `.env` with the same IP address.

## Running The Application

Start Laravel:

```bash
php artisan serve
```

Open:

```text
http://127.0.0.1:8000
```

The dashboard refreshes automatically every 30 seconds.

## Synchronizing Attendance Logs

Run a manual sync:

```bash
php artisan attendance:sync
```

The command will:

1. Connect to the configured ZKTeco device
2. Read registered users from the device
3. Read attendance logs
4. Skip duplicates
5. Save only new logs

To run automatic sync every minute:

```bash
php artisan schedule:work
```

In production, configure a cron job to run Laravel's scheduler:

```bash
* * * * * cd /path/to/project && php artisan schedule:run >> /dev/null 2>&1
```

## API Endpoints

### Get Today's Logs

```http
GET /api/attendance
```

Returns today's attendance logs ordered by latest first.

### Get Today's Summary

```http
GET /api/attendance/today
```

Returns:

- Total check-ins
- Total check-outs
- Total records
- Last activity
- Last sync time
- Today's records

### Get Device Status

```http
GET /api/device/status
```

Returns:

- Online/offline status
- Device time, if available
- Firmware version, if available

## Database Tables

### employees

Stores users read from the device:

- `id`
- `device_user_id`
- `name`
- `created_at`
- `updated_at`

### attendance_logs

Stores raw attendance events:

- `id`
- `device_user_id`
- `employee_name`
- `timestamp`
- `state`
- `verification_type`
- `raw_data`
- `created_at`

Duplicate protection is applied using:

```text
device_user_id + timestamp + state + verification_type
```

## Project Structure

Important files:

```text
app/Console/Commands/AttendanceSyncCommand.php
app/Http/Controllers/Api/AttendanceController.php
app/Http/Controllers/Api/DeviceStatusController.php
app/Services/Attendance/
config/attendance.php
database/migrations/
resources/views/dashboard.blade.php
routes/api.php
routes/console.php
```

The device integration is isolated behind:

```text
App\Services\Attendance\Contracts\AttendanceDeviceClient
```

This makes it easier to replace the ZKTeco library later without changing controllers or commands.

## Troubleshooting

### `php` is not recognized

PHP is not installed or not added to your system PATH. Install PHP 8.2+ and restart the terminal.

### `composer` is not recognized

Install Composer from:

```text
https://getcomposer.org/
```

Then restart the terminal.

### Laravel says PHP version is too old

Laravel 12 requires PHP 8.2 or newer. Upgrade PHP or install a newer XAMPP version.

### Device is offline

Check:

- The device and computer are on the same network
- The device IP in `.env` is correct
- The device port is `4370`
- Windows Firewall is not blocking the connection
- The communication password matches the device setting

### Sync runs but no records appear

Check:

- The device has attendance logs
- The device date/time is correct
- Users are enrolled on the device
- The logs are not already synchronized

## Security Notes

This project has no authentication by design because it is intended for a local monitoring screen. Do not expose it publicly without adding authentication and network protections.

Never commit your real `.env` file. Use `.env.example` for shared configuration examples.

## License

MIT
