// Auto-generated dari skema database Isaji POS. Dipakai oleh Database Explorer (CRUD generik).
export const TABLE_SCHEMA = {
    "attendance_rules": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "organization_id",
            "inputType": "uuid",
            "required": false,
            "default": null
        },
        {
            "name": "late_tolerance_minutes",
            "inputType": "integer",
            "required": false,
            "default": "15"
        },
        {
            "name": "late_deduction_amount",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "sp_trigger_minutes",
            "inputType": "integer",
            "required": false,
            "default": "60"
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        }
    ],
    "attendances": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "employee_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "attendance_date",
            "inputType": "date",
            "required": true,
            "default": null
        },
        {
            "name": "clock_in",
            "inputType": "datetime",
            "required": false,
            "default": null
        },
        {
            "name": "clock_out",
            "inputType": "datetime",
            "required": false,
            "default": null
        },
        {
            "name": "status",
            "inputType": "enum",
            "required": false,
            "default": "'present'::attendance_status"
        },
        {
            "name": "clock_in_location",
            "inputType": "json",
            "required": false,
            "default": null
        },
        {
            "name": "clock_out_location",
            "inputType": "json",
            "required": false,
            "default": null
        },
        {
            "name": "notes",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        },
        {
            "name": "shift_id",
            "inputType": "uuid",
            "required": false,
            "default": null
        },
        {
            "name": "late_minutes",
            "inputType": "integer",
            "required": false,
            "default": "0"
        },
        {
            "name": "deduction_amount",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "sp_issued",
            "inputType": "boolean",
            "required": false,
            "default": "false"
        }
    ],
    "branches": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "organization_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "name",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "code",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "address",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "city",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "province",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "phone",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "latitude",
            "inputType": "number",
            "required": false,
            "default": null
        },
        {
            "name": "longitude",
            "inputType": "number",
            "required": false,
            "default": null
        },
        {
            "name": "timezone",
            "inputType": "text",
            "required": false,
            "default": "'Asia/Jakarta'::text"
        },
        {
            "name": "is_active",
            "inputType": "boolean",
            "required": false,
            "default": "true"
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        },
        {
            "name": "updated_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        },
        {
            "name": "logo_url",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "tax_mode",
            "inputType": "text",
            "required": false,
            "default": "'pb1_10'::text"
        },
        {
            "name": "max_radius_meters",
            "inputType": "integer",
            "required": false,
            "default": "50"
        }
    ],
    "cashier_shifts": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "cashier_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "opening_cash",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "closing_cash",
            "inputType": "number",
            "required": false,
            "default": null
        },
        {
            "name": "expected_cash",
            "inputType": "number",
            "required": false,
            "default": null
        },
        {
            "name": "difference",
            "inputType": "number",
            "required": false,
            "default": null
        },
        {
            "name": "opened_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        },
        {
            "name": "closed_at",
            "inputType": "datetime",
            "required": false,
            "default": null
        }
    ],
    "daily_financial_summaries": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "summary_date",
            "inputType": "date",
            "required": true,
            "default": null
        },
        {
            "name": "gross_sales",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "total_discount",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "net_sales",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "total_cogs",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "gross_profit",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "total_expenses",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "tax_amount",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "net_profit",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "total_orders",
            "inputType": "integer",
            "required": false,
            "default": "0"
        },
        {
            "name": "generated_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        }
    ],
    "discounts": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "organization_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "code",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "name",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "type",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "value",
            "inputType": "number",
            "required": true,
            "default": null
        },
        {
            "name": "min_purchase",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "max_discount",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "quota",
            "inputType": "integer",
            "required": false,
            "default": "100"
        },
        {
            "name": "start_date",
            "inputType": "date",
            "required": false,
            "default": "CURRENT_DATE"
        },
        {
            "name": "end_date",
            "inputType": "date",
            "required": false,
            "default": "((CURRENT_DATE + '1 mon'::interval))::date"
        },
        {
            "name": "is_active",
            "inputType": "boolean",
            "required": false,
            "default": "true"
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "timezone('utc'::text, now())"
        }
    ],
    "employees": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "organization_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": false,
            "default": null
        },
        {
            "name": "user_id",
            "inputType": "uuid",
            "required": false,
            "default": null
        },
        {
            "name": "full_name",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "position",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "employment_type",
            "inputType": "text",
            "required": false,
            "default": "'full_time'::text"
        },
        {
            "name": "join_date",
            "inputType": "date",
            "required": false,
            "default": null
        },
        {
            "name": "resign_date",
            "inputType": "date",
            "required": false,
            "default": null
        },
        {
            "name": "phone",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "address",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "bank_name",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "bank_account_number",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "base_salary",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "hourly_rate",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "is_active",
            "inputType": "boolean",
            "required": false,
            "default": "true"
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        },
        {
            "name": "updated_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        },
        {
            "name": "pin",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "email",
            "inputType": "text",
            "required": false,
            "default": null
        }
    ],
    "expense_categories": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "organization_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "name",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "is_default",
            "inputType": "boolean",
            "required": false,
            "default": "false"
        }
    ],
    "expenses": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "category_id",
            "inputType": "uuid",
            "required": false,
            "default": null
        },
        {
            "name": "description",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "amount",
            "inputType": "number",
            "required": true,
            "default": null
        },
        {
            "name": "expense_date",
            "inputType": "date",
            "required": false,
            "default": "CURRENT_DATE"
        },
        {
            "name": "proof_url",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "created_by",
            "inputType": "uuid",
            "required": false,
            "default": null
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        }
    ],
    "ingredient_stocks": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "ingredient_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "qty_on_hand",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "min_stock_alert",
            "inputType": "number",
            "required": false,
            "default": "0"
        }
    ],
    "ingredients": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "organization_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "name",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "unit",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "cost_per_unit",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        }
    ],
    "initial_capital": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "amount",
            "inputType": "number",
            "required": true,
            "default": null
        },
        {
            "name": "description",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "invested_at",
            "inputType": "date",
            "required": false,
            "default": "CURRENT_DATE"
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        }
    ],
    "inventory_transactions": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "organization_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "item_name",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "category",
            "inputType": "text",
            "required": false,
            "default": "'bahan baku'::text"
        },
        {
            "name": "type",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "quantity",
            "inputType": "number",
            "required": true,
            "default": null
        },
        {
            "name": "unit",
            "inputType": "text",
            "required": false,
            "default": "'pcs'::text"
        },
        {
            "name": "notes",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "created_by",
            "inputType": "uuid",
            "required": false,
            "default": null
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "timezone('utc'::text, now())"
        }
    ],
    "leave_requests": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "employee_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "leave_type",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "start_date",
            "inputType": "date",
            "required": true,
            "default": null
        },
        {
            "name": "end_date",
            "inputType": "date",
            "required": true,
            "default": null
        },
        {
            "name": "reason",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "status",
            "inputType": "enum",
            "required": false,
            "default": "'pending'::leave_status"
        },
        {
            "name": "approved_by",
            "inputType": "uuid",
            "required": false,
            "default": null
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        }
    ],
    "menus": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "organization_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "name",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "category",
            "inputType": "text",
            "required": false,
            "default": "'makanan'::text"
        },
        {
            "name": "description",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "price",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "stock",
            "inputType": "integer",
            "required": false,
            "default": "0"
        },
        {
            "name": "image_url",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "timezone('utc'::text, now())"
        },
        {
            "name": "updated_at",
            "inputType": "datetime",
            "required": false,
            "default": "timezone('utc'::text, now())"
        }
    ],
    "order_item_modifiers": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "order_item_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "modifier_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "price_delta",
            "inputType": "number",
            "required": false,
            "default": "0"
        }
    ],
    "order_items": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "order_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "product_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "variant_id",
            "inputType": "uuid",
            "required": false,
            "default": null
        },
        {
            "name": "qty",
            "inputType": "number",
            "required": false,
            "default": "1"
        },
        {
            "name": "unit_price",
            "inputType": "number",
            "required": true,
            "default": null
        },
        {
            "name": "cost_price",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "subtotal",
            "inputType": "number",
            "required": true,
            "default": null
        },
        {
            "name": "notes",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        }
    ],
    "orders": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "organization_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "table_id",
            "inputType": "uuid",
            "required": false,
            "default": null
        },
        {
            "name": "order_number",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "channel",
            "inputType": "enum",
            "required": false,
            "default": "'pos'::order_channel"
        },
        {
            "name": "status",
            "inputType": "enum",
            "required": false,
            "default": "'pending'::order_status"
        },
        {
            "name": "payment_status",
            "inputType": "enum",
            "required": false,
            "default": "'unpaid'::payment_status"
        },
        {
            "name": "customer_name",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "customer_phone",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "subtotal",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "discount_amount",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "tax_amount",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "service_charge",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "total_amount",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "cashier_id",
            "inputType": "uuid",
            "required": false,
            "default": null
        },
        {
            "name": "shift_id",
            "inputType": "uuid",
            "required": false,
            "default": null
        },
        {
            "name": "notes",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        },
        {
            "name": "updated_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        }
    ],
    "organization_members": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "organization_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "user_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": false,
            "default": null
        },
        {
            "name": "role",
            "inputType": "enum",
            "required": false,
            "default": "'staff'::user_role"
        },
        {
            "name": "is_active",
            "inputType": "boolean",
            "required": false,
            "default": "true"
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        }
    ],
    "organization_profiles": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "organization_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "about_html",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "address",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "phone",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "email",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "instagram_url",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "facebook_url",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "tiktok_url",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "whatsapp_number",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "banner_url",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "gallery",
            "inputType": "json",
            "required": false,
            "default": "'[]'::jsonb"
        },
        {
            "name": "seo_title",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "seo_description",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "custom_domain",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        },
        {
            "name": "updated_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        }
    ],
    "organizations": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "name",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "subdomain",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "logo_url",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "favicon_url",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "tagline",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "description",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "theme_color",
            "inputType": "text",
            "required": false,
            "default": "'#000000'::text"
        },
        {
            "name": "is_active",
            "inputType": "boolean",
            "required": false,
            "default": "true"
        },
        {
            "name": "subscription_plan",
            "inputType": "text",
            "required": false,
            "default": "'trial'::text"
        },
        {
            "name": "subscription_expires_at",
            "inputType": "datetime",
            "required": false,
            "default": null
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        },
        {
            "name": "updated_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        },
        {
            "name": "subscription_status",
            "inputType": "text",
            "required": false,
            "default": "'unpaid'::text"
        },
        {
            "name": "trial_ends_at",
            "inputType": "datetime",
            "required": false,
            "default": null
        },
        {
            "name": "owner_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        }
    ],
    "payment_gateways_config": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "organization_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": false,
            "default": null
        },
        {
            "name": "provider_name",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "is_active",
            "inputType": "boolean",
            "required": false,
            "default": "false"
        },
        {
            "name": "environment",
            "inputType": "text",
            "required": false,
            "default": "'sandbox'::text"
        },
        {
            "name": "merchant_id",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "client_key",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "server_key",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "updated_at",
            "inputType": "datetime",
            "required": false,
            "default": "timezone('utc'::text, now())"
        }
    ],
    "payment_methods": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "organization_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "name",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "type",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "provider_details",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "qr_image_url",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "is_active",
            "inputType": "boolean",
            "required": false,
            "default": "true"
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "timezone('utc'::text, now())"
        }
    ],
    "payments": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "order_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "method",
            "inputType": "enum",
            "required": true,
            "default": null
        },
        {
            "name": "amount",
            "inputType": "number",
            "required": true,
            "default": null
        },
        {
            "name": "reference_number",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "paid_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        },
        {
            "name": "received_by",
            "inputType": "uuid",
            "required": false,
            "default": null
        }
    ],
    "payroll_periods": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "organization_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": false,
            "default": null
        },
        {
            "name": "period_start",
            "inputType": "date",
            "required": true,
            "default": null
        },
        {
            "name": "period_end",
            "inputType": "date",
            "required": true,
            "default": null
        },
        {
            "name": "status",
            "inputType": "text",
            "required": false,
            "default": "'draft'::text"
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        }
    ],
    "payslip_components": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "payslip_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "component_type",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "label",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "amount",
            "inputType": "number",
            "required": true,
            "default": null
        }
    ],
    "payslips": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "payroll_period_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "employee_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "base_salary",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "total_present_days",
            "inputType": "integer",
            "required": false,
            "default": "0"
        },
        {
            "name": "overtime_hours",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "overtime_pay",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "allowances",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "deductions",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "tax_pph21",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "bpjs_amount",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "net_pay",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "is_paid",
            "inputType": "boolean",
            "required": false,
            "default": "false"
        },
        {
            "name": "paid_at",
            "inputType": "datetime",
            "required": false,
            "default": null
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        }
    ],
    "product_branch_settings": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "product_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "price_override",
            "inputType": "number",
            "required": false,
            "default": null
        },
        {
            "name": "is_available",
            "inputType": "boolean",
            "required": false,
            "default": "true"
        },
        {
            "name": "stock_qty",
            "inputType": "number",
            "required": false,
            "default": "0"
        }
    ],
    "product_categories": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "organization_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "name",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "sort_order",
            "inputType": "integer",
            "required": false,
            "default": "0"
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        }
    ],
    "product_modifiers": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "product_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "name",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "price_delta",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "is_required",
            "inputType": "boolean",
            "required": false,
            "default": "false"
        },
        {
            "name": "max_select",
            "inputType": "integer",
            "required": false,
            "default": "1"
        }
    ],
    "product_recipes": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "product_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "ingredient_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "qty_used",
            "inputType": "number",
            "required": true,
            "default": null
        }
    ],
    "product_variants": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "product_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "name",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "price_delta",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "is_default",
            "inputType": "boolean",
            "required": false,
            "default": "false"
        }
    ],
    "products": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "organization_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "category_id",
            "inputType": "uuid",
            "required": false,
            "default": null
        },
        {
            "name": "name",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "description",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "image_url",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "base_price",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "cost_price",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "sku",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "is_active",
            "inputType": "boolean",
            "required": false,
            "default": "true"
        },
        {
            "name": "track_stock",
            "inputType": "boolean",
            "required": false,
            "default": "false"
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        },
        {
            "name": "updated_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        }
    ],
    "shifts": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": false,
            "default": null
        },
        {
            "name": "name",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "start_time",
            "inputType": "time",
            "required": true,
            "default": null
        },
        {
            "name": "end_time",
            "inputType": "time",
            "required": true,
            "default": null
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        }
    ],
    "stock_purchases": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "ingredient_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "qty",
            "inputType": "number",
            "required": true,
            "default": null
        },
        {
            "name": "unit_cost",
            "inputType": "number",
            "required": true,
            "default": null
        },
        {
            "name": "total_cost",
            "inputType": "number",
            "required": true,
            "default": null
        },
        {
            "name": "supplier_name",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "purchased_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        },
        {
            "name": "created_by",
            "inputType": "uuid",
            "required": false,
            "default": null
        }
    ],
    "tables": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "branch_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "name",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "qr_code_token",
            "inputType": "text",
            "required": true,
            "default": null
        },
        {
            "name": "is_active",
            "inputType": "boolean",
            "required": false,
            "default": "true"
        },
        {
            "name": "created_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        },
        {
            "name": "qr_token",
            "inputType": "text",
            "required": false,
            "default": "(gen_random_uuid())::text"
        },
        {
            "name": "capacity",
            "inputType": "integer",
            "required": false,
            "default": "4"
        }
    ],
    "tax_settings": [
        {
            "name": "id",
            "inputType": "readonly",
            "required": false,
            "default": "gen_random_uuid()"
        },
        {
            "name": "organization_id",
            "inputType": "uuid",
            "required": true,
            "default": null
        },
        {
            "name": "scheme",
            "inputType": "enum",
            "required": false,
            "default": "'none'::tax_scheme"
        },
        {
            "name": "custom_rate_percent",
            "inputType": "number",
            "required": false,
            "default": "0"
        },
        {
            "name": "apply_to_selling_price",
            "inputType": "boolean",
            "required": false,
            "default": "true"
        },
        {
            "name": "npwp",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "is_pkp",
            "inputType": "boolean",
            "required": false,
            "default": "false"
        },
        {
            "name": "notes",
            "inputType": "text",
            "required": false,
            "default": null
        },
        {
            "name": "updated_at",
            "inputType": "datetime",
            "required": false,
            "default": "now()"
        }
    ]
};

export const TABLE_GROUPS = {
    'Tenant & Organisasi': ['organizations', 'organization_profiles', 'organization_members', 'branches'],
    'Produk & Menu': ['products', 'product_categories', 'product_variants', 'product_modifiers', 'product_branch_settings', 'product_recipes', 'menus'],
    'Transaksi': ['orders', 'order_items', 'order_item_modifiers', 'payments', 'payment_methods', 'payment_gateways_config', 'tables', 'discounts', 'tax_settings'],
    'Inventori & Bahan Baku': ['ingredients', 'ingredient_stocks', 'stock_purchases', 'inventory_transactions', 'product_recipes'],
    'Keuangan': ['expenses', 'expense_categories', 'initial_capital', 'daily_financial_summaries'],
    'HR & Karyawan': ['employees', 'attendances', 'attendance_rules', 'shifts', 'cashier_shifts', 'leave_requests', 'payroll_periods', 'payslips', 'payslip_components'],
};
