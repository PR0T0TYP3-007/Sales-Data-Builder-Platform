export function requireAuth(req, res, next) {
/**
 * Auth Middleware
 * Handles authentication and authorization logic for protected routes.
 */
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    next();
}

export function requireRole(role) {
/**
 * Role Middleware
 * Checks if the authenticated user has the required role for access.
 */
    return (req, res, next) => {
        if (!req.session.user || req.session.user.role !== role) {
            return res.status(403).render('error', { message: 'Forbidden: Insufficient permissions.' });
        }
        next();
    };
}