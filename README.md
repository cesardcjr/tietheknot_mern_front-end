# tietheknot_mern_front-end
# TieTheKnot Planner Frontend

## Environments

The planner is released through two isolated environments:

| Environment | Git branch | Frontend host | API | Database |
| --- | --- | --- | --- | --- |
| Staging | `staging` | A dedicated Vercel staging project | Dedicated Render staging service | Separate MongoDB staging database |
| Production | `main` | Production Vercel project | Production Render service | Production MongoDB database |

Never point a staging frontend at the production API or database.

### Local development

Copy `.env.example` to `.env.local`, set the local API address, then run:

```powershell
npm.cmd run dev
```

### Staging deployment

1. Create a separate Vercel project for the staging planner. Set its production branch to `staging`.
2. Add the staging values from `.env.staging.example` in that Vercel project. Use the actual staging Render URL for `VITE_API_URL`.
3. Deploy the API from its `staging` branch to a separate Render service with a separate MongoDB connection string.
4. Set the Render service's `ALLOWED_ORIGINS` to the exact staging planner URL (and the staging Invitation Studio URL when used).
5. Test registration, administrator approval, sign-in, password reset, and planner data isolation in staging before opening a `staging` → `main` pull request.

`VITE_*` values are embedded when the frontend is built, so changing them requires a new staging deployment.

### Registration troubleshooting

If registration fails on staging, check these settings in order:

1. The staging Vercel deployment must be publicly reachable by test users. Disable Vercel Deployment Protection for the staging deployment, or explicitly grant testers access.
2. In the staging Vercel project's environment variables, set `VITE_API_URL` to the complete staging Render API address ending in `/api`. Do not leave it unset: an unset value falls back to `http://localhost:5000/api`, which only works on a developer's computer.
3. Confirm the staging Render service is running and its root URL responds.
4. Set the Render service's `ALLOWED_ORIGINS` to this exact Vercel origin: `https://tietheknot-mern-front-az6ajc4z5-iamcesarjrs-projects.vercel.app`.
5. Redeploy the Vercel frontend after changing `VITE_API_URL`, and redeploy Render after changing `ALLOWED_ORIGINS`.
