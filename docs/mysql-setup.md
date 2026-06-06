# MySQL Setup

## XAMPP

Start MySQL, open phpMyAdmin, create:

```sql
CREATE DATABASE chatleadiq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Use `DATABASE_URL=mysql://root:@localhost:3306/chatleadiq`.

## Laragon

Start MySQL from Laragon and use the same database command. Adjust user/password if changed.

## Docker MySQL

Run `docker compose up mysql`.

## cPanel MySQL

Create a database and user from MySQL Database Wizard. Use the full cPanel database/user names in `DATABASE_URL`.

## Remote MySQL

Ensure the host allows remote connections from your server IP. Use utf8mb4 charset where available.

ChatLeadIQ stores JSON-compatible fields as `LongText` for broad MySQL compatibility.
