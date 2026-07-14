<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationSetupTest extends TestCase
{
    use RefreshDatabase;

    public function test_first_run_redirects_to_setup_when_no_account_exists(): void
    {
        $this->get('/')
            ->assertRedirect(route('setup.show'));

        $this->get('/login')
            ->assertRedirect(route('setup.show'));
    }

    public function test_setup_page_creates_the_installation_account(): void
    {
        $this->post('/setup', [
            'username' => 'owner',
            'password' => 'Secret123!',
            'password_confirmation' => 'Secret123!',
        ])->assertRedirect(route('dashboard'));

        $this->assertDatabaseHas('users', [
            'name' => 'owner',
            'role' => User::ROLE_ADMINISTRATOR,
        ]);

        $this->assertDatabaseHas('application_settings', [
            'key' => 'app.initialized_at',
        ]);
        $this->assertSame(1, User::query()->count());
    }

    public function test_setup_page_accepts_a_short_simple_password(): void
    {
        $this->post('/setup', [
            'username' => 'owner',
            'password' => '7',
            'password_confirmation' => '7',
        ])->assertRedirect(route('dashboard'));

        $this->assertDatabaseHas('users', [
            'name' => 'owner',
            'role' => User::ROLE_ADMINISTRATOR,
        ]);
    }

    public function test_login_uses_the_saved_installation_account(): void
    {
        $this->createInitializedAdministrator([
            'name' => 'owner',
            'email' => 'owner@local.nexa',
            'password' => 'Secret123!',
        ]);

        $this->post('/login', [
            'username' => 'owner',
            'password' => 'Secret123!',
        ])
            ->assertRedirect(route('dashboard'))
            ->assertSessionHas('auth_user_id');
    }

    public function test_setup_is_not_available_after_account_exists(): void
    {
        $this->createInitializedAdministrator([
            'name' => 'owner',
            'email' => 'owner@local.nexa',
            'password' => 'Secret123!',
        ]);

        $this->get('/setup')
            ->assertRedirect(route('login.show'));
    }

    public function test_initialize_command_creates_the_first_administrator_and_marks_the_app_initialized(): void
    {
        $this->artisan('app:initialize', [
            '--username' => 'owner',
            '--password' => 'Secret123!',
            '--password-confirmation' => 'Secret123!',
        ])->assertSuccessful();

        $this->assertDatabaseHas('users', [
            'name' => 'owner',
            'email' => 'owner@local.nexa',
            'role' => User::ROLE_ADMINISTRATOR,
        ]);

        $this->assertDatabaseHas('application_settings', [
            'key' => 'app.initialized_at',
        ]);
    }

    public function test_initialize_command_refuses_to_run_twice(): void
    {
        $this->createInitializedAdministrator();

        $this->artisan('app:initialize', [
            '--username' => 'owner',
            '--password' => 'Secret123!',
            '--password-confirmation' => 'Secret123!',
        ])->assertFailed();
    }

    public function test_installation_incomplete_page_is_shown_when_browser_setup_is_disabled(): void
    {
        config()->set('installation.allow_browser_setup', false);

        $this->get('/login')
            ->assertRedirect(route('installation.incomplete'));

        $this->get(route('installation.incomplete'))
            ->assertOk()
            ->assertSee('Installation Incomplete');
    }
}
