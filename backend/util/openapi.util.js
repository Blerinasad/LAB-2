export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Smart Kitchen & Marketplace API",
    version: "2.0.0",
    description: `
## Smart Kitchen & Marketplace System
**Lab Course 2 + Machine Learning — UBT 2025–2026**

### Authentication
Kjo API përdor **JWT Access Token** (15 min) + **Refresh Token** (cookie httpOnly, 7 ditë).

1. POST \`/auth/login\` → merr \`token\` (access) + cookie \`refreshToken\`
2. Çdo request: Header \`Authorization: Bearer {token}\`
3. Kur token skadon → POST \`/auth/refresh-token\` → token i ri automatikisht

### Roles & Permissions
| Role | Permissions |
|------|-------------|
| Admin | Gjithçka |
| Manager | Porositë e marketit, ingredientët, recetat |
| Courier | Merr dhe dorëzon porositë |
| User | Inventari, recetat, listat, porositë e veta |
    `.trim(),
    contact: { name: "Smart Kitchen Team", email: "admin@smartkitchen.com" },
    license: { name: "UBT Academic License" },
  },
  servers: [{ url: "http://localhost:5000/api", description: "Development" }],
  tags: [
    { name: "Auth", description: "Login, logout, refresh, reset password" },
    { name: "Users", description: "Admin: menaxhim përdoruesish" },
    { name: "Ingredients", description: "Ingredientët dhe kategoritë" },
    {
      name: "Inventory",
      description: "Inventari personal, eksport/import CSV",
    },
    { name: "Recipes", description: "Recetat dhe vlerësimet" },
    { name: "MealPlans", description: "Planet javore të vakteve" },
    { name: "ShoppingLists", description: "Listat e blerjeve dhe artikujt" },
    { name: "Notifications", description: "Njoftimet live" },
    { name: "Reports", description: "Raporte dinamike me eksport CSV" },
    { name: "Marketplace", description: "Porositë online, dyqanet, dorëzimi" },
    {
      name: "ML",
      description: "Machine Learning — rekomandime, parashikime, clustering",
    },
    { name: "Settings", description: "Konfigurime globale të sistemit" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Gabim i serverit" },
        },
      },
      Success: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "object" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "blerta@smartkitchen.com",
          },
          password: { type: "string", minLength: 6, example: "Password123!" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          first_name: { type: "string" },
          last_name: { type: "string" },
          email: { type: "string", format: "email" },
          roles: { type: "array", items: { type: "string" } },
          is_active: { type: "boolean" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      InventoryItem: {
        type: "object",
        properties: {
          id: { type: "integer" },
          ingredient_id: { type: "integer" },
          ingredient_name: { type: "string" },
          category_name: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string" },
          location: {
            type: "string",
            enum: ["Fridge", "Freezer", "Pantry", "Counter"],
          },
          expiry_date: { type: "string", format: "date" },
          days_until_expiry: { type: "integer" },
          purchase_date: { type: "string", format: "date" },
        },
      },
      Recipe: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          description: { type: "string" },
          instructions: { type: "string" },
          prep_time_min: { type: "integer" },
          cook_time_min: { type: "integer" },
          servings: { type: "integer" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          meal_type: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner", "snack"],
          },
        },
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "integer" },
          store_name: { type: "string" },
          status: {
            type: "string",
            enum: [
              "pending",
              "accepted",
              "preparing",
              "out_for_delivery",
              "delivered",
              "rejected",
              "cancelled",
            ],
          },
          estimated_total: { type: "number" },
          delivery_address: { type: "string" },
          total_items: { type: "integer" },
          created_at: { type: "string", format: "date-time" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // ── AUTH ──────────────────────────────────────────────
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Login i suksesshëm — token + cookie",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        token: {
                          type: "string",
                          description: "JWT access token (15 min)",
                        },
                        refreshToken: {
                          type: "string",
                          description: "Refresh token (7 ditë)",
                        },
                        user: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Kredenciale të gabuara" },
          429: { description: "Shumë tentativa — rate limited" },
        },
      },
    },
    "/auth/refresh-token": {
      post: {
        tags: ["Auth"],
        summary: "Rifresko access token (cookie rotation)",
        security: [],
        responses: {
          200: { description: "Token i ri" },
          401: { description: "Refresh token i pavlefshëm ose skaduar" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout sesionit aktual",
        responses: { 200: { description: "Logged out" } },
      },
    },
    "/auth/logout-all": {
      post: {
        tags: ["Auth"],
        summary: "Logout të gjitha sesioneve",
        responses: { 200: { description: "Të gjitha sesionet u revokuan" } },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Profili i përdoruesit aktual",
        responses: { 200: { description: "User profili" } },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Kërko link rivendosjeje fjalëkalimi",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email" } },
              },
            },
          },
        },
        responses: {
          200: { description: "Email u dërgua (gjithmonë 200 për siguri)" },
        },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Rivendos fjalëkalimin me token nga email",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "uid", "password"],
                properties: {
                  token: { type: "string" },
                  uid: { type: "integer" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Fjalëkalimi u ndryshua" },
          400: { description: "Token i pavlefshëm ose skaduar" },
        },
      },
    },

    // ── USERS ────────────────────────────────────────────
    "/users": {
      get: {
        tags: ["Users"],
        summary: "Admin: lista e përdoruesve me kërkim",
        parameters: [
          { name: "search", in: "query" },
          { name: "role", in: "query" },
          { name: "is_active", in: "query" },
        ],
        responses: { 200: { description: "Lista e users" } },
      },
      post: {
        tags: ["Users"],
        summary: "Admin: krijo përdorues",
        requestBody: { required: true },
        responses: { 201: { description: "Përdoruesi u krijua" } },
      },
    },
    "/users/{id}": {
      put: {
        tags: ["Users"],
        summary: "Admin: përditëso",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Përditësuar" } },
      },
      delete: {
        tags: ["Users"],
        summary: "Admin: fshi (soft delete)",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Fshirë" } },
      },
    },
    "/users/{id}/toggle": {
      patch: {
        tags: ["Users"],
        summary: "Admin: aktivizo/deaktivizo llogarinë",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Statusi u ndryshua" } },
      },
    },

    // ── INGREDIENTS ──────────────────────────────────────
    "/categories": {
      get: {
        tags: ["Ingredients"],
        summary: "Lista kategorive",
        responses: { 200: { description: "Kategoritë" } },
      },
    },
    "/ingredients": {
      get: {
        tags: ["Ingredients"],
        summary: "Kërko ingredientë",
        parameters: [
          { name: "search", in: "query" },
          { name: "category_id", in: "query" },
          { name: "page", in: "query" },
          { name: "limit", in: "query" },
        ],
        responses: { 200: { description: "Ingredientët" } },
      },
      post: {
        tags: ["Ingredients"],
        summary: "Manager: krijo ingredient",
        responses: { 201: { description: "Ingredient i ri" } },
      },
    },
    "/ingredients/{id}": {
      get: {
        tags: ["Ingredients"],
        summary: "Detajet",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Ingredient" } },
      },
      put: {
        tags: ["Ingredients"],
        summary: "Manager: përditëso",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Përditësuar" } },
      },
      delete: {
        tags: ["Ingredients"],
        summary: "Admin: fshi",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Fshirë" } },
      },
    },

    // ── INVENTORY ────────────────────────────────────────
    "/inventory": {
      get: {
        tags: ["Inventory"],
        summary: "Inventari me kërkim të avancuar",
        parameters: [
          { name: "search", in: "query" },
          { name: "category_id", in: "query" },
          { name: "location", in: "query" },
          {
            name: "expiring_days",
            in: "query",
            description: "Filtro artikujt që skadojnë brenda X ditëve",
          },
          { name: "page", in: "query" },
          { name: "limit", in: "query" },
          { name: "sort", in: "query" },
          { name: "order", in: "query" },
        ],
        responses: {
          200: {
            description: "Inventari paginuar",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/InventoryItem" },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Inventory"],
        summary: "Shto artikull në inventar",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["ingredient_id", "quantity", "expiry_date"],
                properties: {
                  ingredient_id: { type: "integer" },
                  quantity: { type: "number" },
                  unit: { type: "string" },
                  location: {
                    type: "string",
                    enum: ["Fridge", "Freezer", "Pantry", "Counter"],
                  },
                  expiry_date: { type: "string", format: "date" },
                  purchase_date: { type: "string", format: "date" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Artikulli u shtua" } },
      },
    },
    "/inventory/expiring": {
      get: {
        tags: ["Inventory"],
        summary: "Artikujt që skadojnë",
        parameters: [{ name: "days", in: "query", description: "Default: 3" }],
        responses: { 200: { description: "Artikujt skadues" } },
      },
    },
    "/inventory/export": {
      get: {
        tags: ["Inventory"],
        summary: "Eksporto inventarin si CSV",
        responses: {
          200: { description: "CSV file", content: { "text/csv": {} } },
        },
      },
    },
    "/inventory/import": {
      post: {
        tags: ["Inventory"],
        summary: "Importo inventarin nga CSV",
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { file: { type: "string", format: "binary" } },
              },
            },
          },
        },
        responses: { 200: { description: "Importuar me sukses" } },
      },
    },
    "/inventory/{id}": {
      get: {
        tags: ["Inventory"],
        summary: "Detajet",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Artikulli" } },
      },
      put: {
        tags: ["Inventory"],
        summary: "Përditëso",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Përditësuar" } },
      },
      delete: {
        tags: ["Inventory"],
        summary: "Fshi",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Fshirë" } },
      },
    },

    // ── RECIPES ──────────────────────────────────────────
    "/recipes": {
      get: {
        tags: ["Recipes"],
        summary: "Kërko receta",
        parameters: [
          { name: "search", in: "query" },
          {
            name: "difficulty",
            in: "query",
            schema: { type: "string", enum: ["easy", "medium", "hard"] },
          },
          { name: "meal_type", in: "query" },
          { name: "page", in: "query" },
          { name: "limit", in: "query" },
        ],
        responses: { 200: { description: "Recetat" } },
      },
      post: {
        tags: ["Recipes"],
        summary: "Krijo recetë",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "instructions"],
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  instructions: { type: "string" },
                  prep_time_min: { type: "integer" },
                  cook_time_min: { type: "integer" },
                  servings: { type: "integer" },
                  difficulty: {
                    type: "string",
                    enum: ["easy", "medium", "hard"],
                  },
                  meal_type: {
                    type: "string",
                    enum: ["breakfast", "lunch", "dinner", "snack"],
                  },
                  is_public: { type: "boolean" },
                  ingredients: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        ingredient_id: { type: "integer" },
                        quantity: { type: "number" },
                        unit: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Receta u krijua" } },
      },
    },
    "/recipes/export": {
      get: {
        tags: ["Recipes"],
        summary: "Eksporto recetat si CSV",
        responses: { 200: { description: "CSV" } },
      },
    },
    "/recipes/{id}": {
      get: {
        tags: ["Recipes"],
        summary: "Detajet me ingredientë",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Receta" } },
      },
      put: {
        tags: ["Recipes"],
        summary: "Përditëso (Manager)",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Përditësuar" } },
      },
      delete: {
        tags: ["Recipes"],
        summary: "Fshi (Admin)",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Fshirë" } },
      },
    },
    "/recipes/{id}/rate": {
      post: {
        tags: ["Recipes"],
        summary: "Vlerëso recetën (1-5)",
        parameters: [{ name: "id", in: "path", required: true }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["rating"],
                properties: {
                  rating: { type: "integer", minimum: 1, maximum: 5 },
                  comment: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Vlerësimi u ruajt me mesataren" } },
      },
    },

    // ── MEAL PLANS ───────────────────────────────────────
    "/meal-plans": {
      get: {
        tags: ["MealPlans"],
        summary: "Planet javore me filtra",
        parameters: [
          { name: "search", in: "query" },
          { name: "status", in: "query" },
          { name: "week_start", in: "query" },
          { name: "from_date", in: "query" },
          { name: "to_date", in: "query" },
        ],
        responses: { 200: { description: "Planet" } },
      },
      post: {
        tags: ["MealPlans"],
        summary: "Krijo plan javor",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "week_start", "week_end"],
                properties: {
                  title: { type: "string" },
                  week_start: { type: "string", format: "date" },
                  week_end: { type: "string", format: "date" },
                  status: {
                    type: "string",
                    enum: ["draft", "active", "completed"],
                  },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Plani u krijua" } },
      },
    },
    "/meal-plans/{id}": {
      get: {
        tags: ["MealPlans"],
        summary: "Detajet me ditët",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Plani" } },
      },
      put: {
        tags: ["MealPlans"],
        summary: "Përditëso",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Përditësuar" } },
      },
      delete: {
        tags: ["MealPlans"],
        summary: "Fshi",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Fshirë" } },
      },
    },
    "/meal-plans/{id}/generate-shopping": {
      post: {
        tags: ["MealPlans"],
        summary: "Gjenero listë blerjesh nga ingredientët mungues",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 201: { description: "Lista u gjenerua" } },
      },
    },
    "/meal-plans/{id}/days": {
      post: {
        tags: ["MealPlans"],
        summary: "Shto vakt në ditë",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 201: { description: "Vakti u shtua" } },
      },
    },
    "/meal-plans/{id}/days/{dayId}": {
      delete: {
        tags: ["MealPlans"],
        summary: "Hiq vaktin",
        parameters: [
          { name: "id", in: "path", required: true },
          { name: "dayId", in: "path", required: true },
        ],
        responses: { 200: { description: "Vakti u hoq" } },
      },
    },

    // ── SHOPPING LISTS ───────────────────────────────────
    "/shopping-lists": {
      get: {
        tags: ["ShoppingLists"],
        summary: "Listat me filtra",
        parameters: [
          { name: "search", in: "query" },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["active", "completed", "archived"],
            },
          },
          { name: "sort", in: "query" },
          { name: "order", in: "query" },
        ],
        responses: { 200: { description: "Listat" } },
      },
      post: {
        tags: ["ShoppingLists"],
        summary: "Krijo listë",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: { title: { type: "string", minLength: 3 } },
              },
            },
          },
        },
        responses: { 201: { description: "Lista u krijua" } },
      },
    },
    "/shopping-lists/suggestions": {
      get: {
        tags: ["ShoppingLists"],
        summary: "Sugjerime ML — artikuj me stok të ulët ose skadues",
        parameters: [{ name: "limit", in: "query" }],
        responses: { 200: { description: "Sugjerime" } },
      },
    },
    "/shopping-lists/{id}": {
      get: {
        tags: ["ShoppingLists"],
        summary: "Lista me artikuj",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Lista" } },
      },
      patch: {
        tags: ["ShoppingLists"],
        summary: "Ndrysho statusin",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Statusi u ndryshua" } },
      },
      delete: {
        tags: ["ShoppingLists"],
        summary: "Fshi listën",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Fshirë" } },
      },
    },
    "/shopping-lists/{id}/export": {
      get: {
        tags: ["ShoppingLists"],
        summary: "Eksporto listën si CSV",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "CSV" } },
      },
    },
    "/shopping-lists/{id}/items": {
      post: {
        tags: ["ShoppingLists"],
        summary: "Shto artikull",
        parameters: [{ name: "id", in: "path", required: true }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["ingredient_id", "quantity_needed", "unit"],
                properties: {
                  ingredient_id: { type: "integer" },
                  quantity_needed: { type: "number" },
                  unit: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Artikulli u shtua" } },
      },
    },
    "/shopping-lists/{listId}/items/{itemId}/purchase": {
      patch: {
        tags: ["ShoppingLists"],
        summary: "Shëno si blerë / s'është blerë",
        parameters: [
          { name: "listId", in: "path", required: true },
          { name: "itemId", in: "path", required: true },
        ],
        responses: { 200: { description: "Statusi u ndryshua" } },
      },
    },
    "/shopping-lists/{listId}/items/{itemId}": {
      delete: {
        tags: ["ShoppingLists"],
        summary: "Hiq artikullin",
        parameters: [
          { name: "listId", in: "path", required: true },
          { name: "itemId", in: "path", required: true },
        ],
        responses: { 200: { description: "Fshirë" } },
      },
    },

    // ── NOTIFICATIONS ────────────────────────────────────
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Njoftimet e mia",
        parameters: [
          { name: "is_read", in: "query" },
          { name: "limit", in: "query" },
        ],
        responses: { 200: { description: "Njoftimet" } },
      },
    },
    "/notifications/unread-count": {
      get: {
        tags: ["Notifications"],
        summary: "Numri i palexuarve",
        responses: { 200: { description: "Count" } },
      },
    },
    "/notifications/{id}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Shëno si lexuar",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Lexuar" } },
      },
    },
    "/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Shëno të gjitha si lexuar",
        responses: { 200: { description: "Të gjitha lexuar" } },
      },
    },

    // ── REPORTS ──────────────────────────────────────────
    "/reports/summary": {
      get: {
        tags: ["Reports"],
        summary: "Raporti dinamik — statistika kryesore",
        parameters: [
          { name: "from_date", in: "query" },
          { name: "to_date", in: "query" },
        ],
        responses: { 200: { description: "Summary" } },
      },
    },
    "/reports/waste": {
      get: {
        tags: ["Reports"],
        summary: "Raporti i humbjes — JSON ose CSV",
        parameters: [
          { name: "from_date", in: "query" },
          { name: "to_date", in: "query" },
          { name: "format", in: "query", description: "'csv' për eksport" },
        ],
        responses: { 200: { description: "Waste data" } },
      },
    },
    "/reports/consumption": {
      get: {
        tags: ["Reports"],
        summary: "Raporti i konsumimit",
        parameters: [
          { name: "from_date", in: "query" },
          { name: "to_date", in: "query" },
          { name: "format", in: "query" },
        ],
        responses: { 200: { description: "Consumption data" } },
      },
    },
    "/reports/audit": {
      get: {
        tags: ["Reports"],
        summary: "Admin: audit trail — çdo veprim kritik",
        parameters: [
          { name: "limit", in: "query" },
          { name: "user_id", in: "query" },
          { name: "action", in: "query" },
          { name: "from_date", in: "query" },
          { name: "to_date", in: "query" },
        ],
        responses: { 200: { description: "Audit log" } },
      },
    },
    "/reports/audit-logs": {
      get: {
        tags: ["Reports"],
        summary: "Admin: audit logs të filtruara sipas përdoruesit",
        parameters: [
          { name: "userId", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: { 200: { description: "Audit logs" } },
      },
    },

    // ── MARKETPLACE ──────────────────────────────────────
    "/market/stores": {
      get: {
        tags: ["Marketplace"],
        summary: "Dyqanet aktive",
        responses: { 200: { description: "Stores" } },
      },
    },
    "/market/orders": {
      post: {
        tags: ["Marketplace"],
        summary: "Krijo porosi nga lista e blerjeve",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["shopping_list_id", "store_id", "delivery_address"],
                properties: {
                  shopping_list_id: { type: "integer" },
                  store_id: { type: "integer" },
                  delivery_address: { type: "string" },
                  delivery_note: { type: "string" },
                  payment_method: { type: "string", enum: ["cash"] },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Porosia u krijua, notifikim live dërgohet",
            $ref: "#/components/schemas/Order",
          },
        },
      },
    },
    "/market/orders/my": {
      get: {
        tags: ["Marketplace"],
        summary: "Porositë e mia",
        responses: { 200: { description: "Orders" } },
      },
    },
    "/market/orders/store": {
      get: {
        tags: ["Marketplace"],
        summary: "Manager: radhë e porosive të dyqanit",
        responses: { 200: { description: "Store orders" } },
      },
    },
    "/market/orders/courier": {
      get: {
        tags: ["Marketplace"],
        summary: "Courier: porositë e disponueshme",
        responses: { 200: { description: "Available orders" } },
      },
    },
    "/market/orders/forecast": {
      get: {
        tags: ["Marketplace"],
        summary: "ML: parashiko buxhetin mujor të blerjeve",
        responses: { 200: { description: "Budget forecast" } },
      },
    },
    "/market/orders/{id}": {
      get: {
        tags: ["Marketplace"],
        summary: "Detajet me artikuj",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Order detail" } },
      },
    },
    "/market/orders/{id}/status": {
      patch: {
        tags: ["Marketplace"],
        summary: "Ndrysho statusin + WebSocket notification live",
        parameters: [{ name: "id", in: "path", required: true }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: [
                      "accepted",
                      "rejected",
                      "preparing",
                      "out_for_delivery",
                      "delivered",
                      "cancelled",
                    ],
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Statusi + notification te useri" } },
      },
    },
    "/market/orders/{id}/claim": {
      post: {
        tags: ["Marketplace"],
        summary: "Courier: merr porosinë",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 200: { description: "Porosia u mor" } },
      },
    },
    "/market/orders/{id}/rebuy": {
      post: {
        tags: ["Marketplace"],
        summary: "Krijo listë blerjesh nga porosia e kaluar",
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { 201: { description: "Lista e riblerjes" } },
      },
    },

    // ── ML ───────────────────────────────────────────────
    "/ml/health": {
      get: {
        tags: ["ML"],
        summary: "Kontrollo statusin e ML service",
        responses: {
          200: { description: "ML service aktiv" },
          503: { description: "ML service offline" },
        },
      },
    },
    "/ml/recommendations/my": {
      get: {
        tags: ["ML"],
        summary:
          "Rekomandime recetash bazuar në inventarin tim (TF-IDF + Cosine Similarity)",
        responses: {
          200: {
            description: "Recommendations me match % dhe ingredientët mungues",
          },
        },
      },
    },
    "/ml/classifiers/compare": {
      get: {
        tags: ["ML"],
        summary:
          "Krahaso 5 klasifikues (LR, KNN, RF, NN x2) — F1, Accuracy, CV",
        parameters: [
          { name: "retrain", in: "query", description: "'true' për ritrajnim" },
        ],
        responses: { 200: { description: "Metrics dhe confusion matrices" } },
      },
    },
    "/ml/clustering/my": {
      get: {
        tags: ["ML"],
        summary: "KMeans clustering i ingredientëve tim",
        parameters: [
          { name: "n_clusters", in: "query", description: "Default: 3" },
        ],
        responses: { 200: { description: "Clusteret me waste ratio" } },
      },
    },
    "/ml/clustering": {
      get: {
        tags: ["ML"],
        summary: "Alias për clustering të user-it aktual",
        parameters: [
          { name: "n_clusters", in: "query", description: "Default: 3" },
        ],
        responses: { 200: { description: "Clusteret me waste ratio" } },
      },
    },
    "/ml/preferences/my": {
      get: {
        tags: ["ML"],
        summary:
          "Klasifikim profili ushqimor (Standard/Vegetarian/Gluten-Free/Keto)",
        responses: { 200: { description: "Profili + besueshmëria" } },
      },
    },
    "/ml/preferences": {
      get: {
        tags: ["ML"],
        summary: "Alias për profilin ushqimor të user-it aktual",
        responses: { 200: { description: "Profili + besueshmëria" } },
      },
    },
    "/ml/classify/risk": {
      post: {
        tags: ["ML"],
        summary: "Parashiko risk level (low/medium/high) të një artikulli",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "category_id",
                  "shelf_life_days",
                  "quantity",
                  "days_until_expiry",
                ],
                properties: {
                  category_id: {
                    type: "integer",
                    description:
                      "1=Perime,2=Fruta,3=Mish,4=Bulmet,5=Drithëra,6=Erëza",
                  },
                  shelf_life_days: { type: "integer" },
                  quantity: { type: "number" },
                  days_until_expiry: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Risk level + probabilitetet nga 4 modele" },
        },
      },
    },
    "/ml/predict/waste": {
      post: {
        tags: ["ML"],
        summary: "Parashiko waste për një artikull",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { 200: { description: "Parashikimi i waste" } },
      },
    },
    "/ml/predict/expiry": {
      post: {
        tags: ["ML"],
        summary: "Parashiko skadimin e një artikulli",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { 200: { description: "Parashikimi i skadimit" } },
      },
    },
    "/ml/detect-food-image": {
      post: {
        tags: ["ML"],
        summary: "Identifiko produkt ushqimor nga foto",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["image"],
                properties: {
                  image: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Produkt i detektuar dhe metadata" } },
      },
    },

    // ── SETTINGS ─────────────────────────────────────────
    "/settings": {
      get: {
        tags: ["Settings"],
        summary: "Lista konfigurimeve të sistemit",
        responses: { 200: { description: "Settings" } },
      },
    },
    "/settings/{key}": {
      put: {
        tags: ["Settings"],
        summary: "Admin/Manager: ndrysho konfigurimin",
        parameters: [{ name: "key", in: "path", required: true }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { value: { type: "string" } },
              },
            },
          },
        },
        responses: { 200: { description: "Setting u përditësua" } },
      },
    },

    // ── PREFERENCES ──────────────────────────────────────
    "/preferences": {
      get: {
        tags: ["ML"],
        summary: "Lexo preferencat ushqimore",
        responses: { 200: { description: "Preferencat" } },
      },
      put: {
        tags: ["ML"],
        summary: "Ruaj preferencat",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  is_vegetarian: { type: "boolean" },
                  is_vegan: { type: "boolean" },
                  is_gluten_free: { type: "boolean" },
                  is_keto: { type: "boolean" },
                  allergies: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Ruajtur" } },
      },
    },
  },
};
