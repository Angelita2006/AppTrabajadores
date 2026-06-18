-- activar pgcrypto
create extension if not exists pgcrypto;

-- crear esquema limpio
create schema if not exists public;