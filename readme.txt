Sales Data Builder Platform
=========================

Overview
--------
A robust, full-stack sales data builder platform for uploading, enriching, and managing company data. Features include file upload, advanced enrichment (using multiple sources), group/workflow logic, industry classification, role-based access, and a modern EJS/Node.js frontend.

Features
--------
- Upload company data (PDF, CSV, Excel)
- Enrich companies using:
  - OpenCorporates registry API
  - NLP extraction from scraped text
  - Website scraping
  - Social media public search (Facebook, Twitter, LinkedIn, Instagram)
  - Business directories (Yelp, YellowPages, BBB)
  - Domain guessing and Google search
- Group and workflow management
- Task assignment and audit logging
- Role-based access (admin, manager, member)
- Responsive, styled frontend (EJS, CSS, JS)
- Custom 404 and error pages

Setup
-----
1. Clone the repository.
2. Install dependencies:
   npm install
3. Configure your database in `config/database.js`.
4. Start the server:
   nodemon app.js
5. Visit http://localhost:3000 in your browser.

Usage
-----
- Login with demo users (see login page for credentials).
- Upload company data via the dashboard.
- Enrich companies (individually, in bulk, or by selection).
- View and manage groups, workflows, and tasks.
- See audit logs for all enrichment and management actions.

Enrichment Details
------------------
- Companies can be enriched with just a name, phone, and address (website is optional).
- The enrichment pipeline tries multiple sources and deduplicates/prioritizes the best website and social links.
- Timeout for advanced website guessing is 10 seconds for responsiveness.

Customization
-------------
- Edit CSS in `public/css/main.css` for branding.
- Add/modify EJS views in `views/`.
- Extend enrichment logic in `services/` as needed.

Error Handling
--------------
- Custom 404 page for missing routes.
- All errors are logged and user-friendly messages are shown.

License
-------
MIT License (or specify your own)

Contact
-------
For support or questions, contact the project maintainer.
