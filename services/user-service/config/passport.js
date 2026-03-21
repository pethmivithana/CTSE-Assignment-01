const passport = require("passport");
const User = require("../models/UserModel");

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const GoogleStrategy = require("passport-google-oauth20").Strategy;
  passport.use(
    new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5002/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          return done(null, user);
        }
        user = await User.findOne({ email: profile.emails?.[0]?.value });
        if (user) {
          user.googleId = profile.id;
          await user.save({ validateBeforeSave: false });
          return done(null, user);
        }
        const newUser = new User({
          fullName: profile.displayName || profile.name?.givenName || "User",
          email: profile.emails?.[0]?.value || `google_${profile.id}@feedo.local`,
          password: require("crypto").randomBytes(32).toString("hex"),
          contactNumber: "0000000000",
          role: "customer",
          isApproved: true,
          isVerified: true,
          googleId: profile.id,
        });
        await newUser.save({ validateBeforeSave: false });
        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    }
  )
  );
} else {
  console.warn("Google OAuth not configured (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)");
}

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
