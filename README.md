# Learning Buddy Platform

A modern, interactive learning platform that provides personalized programming courses based on user preferences and skill levels.

## Features

- 🔐 User authentication and profile management
- 🎯 Personalized course recommendations
- 📚 Interactive course content with code examples
- ✅ Course enrollment and progress tracking
- 🔄 Automatic content generation using AI
- 💾 Persistent data storage with Supabase
- 📊 Progress tracking and lesson management
- 🎓 User-specific lesson assignments

## Database Schema

The platform uses a consolidated content storage system with the following main tables:

### consolidated_content
- Stores all generated content and metadata in one place
- Includes content hash, actual content, and user message
- Tracks topics, programming languages, and frameworks
- Maintains learning style and level information
- Uses efficient indexing for fast queries
- Protected by Row Level Security (RLS)

### user_courses
- Tracks user enrollment and progress
- References content through content_hash
- Includes enrollment and completion timestamps
- Protected by Row Level Security (RLS)

For more details, check the migration files in the `supabase/migrations` directory.