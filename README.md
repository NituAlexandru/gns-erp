/next-app
├─ app
│ ├─ api
│ │ ├─ users
│ │ │ ├─ route.ts ← GET, POST, PATCH, DELETE pentru users
│ │ │ └─ [id]
│ │ │ └─ route.ts ← GET /api/users/:id
│ │ ├─ products
│ │ │ ├─ route.ts
│ │ │ └─ [id]
│ │ │ └─ route.ts
│ │ ├─ orders
│ │ └─ … (restul modulelor)
│ ├─ auth ← layout + pagini SignIn/SignUp
│ ├─ admin ← UI shadcn + tailwind
│ └─ … (restul paginilor în /app)
│
├─ lib
│ ├─ db.ts ← `connectToDatabase()`
│ ├─ models
│ │ ├─ user.model.ts ← Mongoose schemas + `export default User`
│ │ ├─ product.model.ts
│ │ └─ …  
│ ├─ server
│ │ ├─ user.service.ts ← toată logica veche din UserService → export funcții
│ │ ├─ product.service.ts
│ │ └─ …
│ └─ validator.ts ← Zod schemas pentru toate entitățile
│
├─ hooks
│ └─ useAuth.ts ← Zustand pentru starea de autentificare
│
├─ types
│ └─ index.ts ← toate tipurile TS generate din Zod
│
├─ components
│ └─ ui ← butoane, carduri etc. (shadcn)
│
└─ … alte foldere
