# Copilot Instructions for Day-Care Rotation System

## Project Overview
A web application for visualizing and managing day-care rotation schedules. The system tracks children organized into groups (A, B, C, D) with rotating daily priorities and dynamic capacity management based on staff availability.

## Core Business Logic

### Rotation System
- **Groups**: Children are organized into groups A, B, C, D
- **Daily Rotation**: Group priority order is stored in database, not calculated
- **Capacity Management**: When staff shortages occur, groups are excluded from the end of the daily priority order
  - Example: If daily order is A,B,C,D with 3 groups capacity: A,B,C attend (D stays home)

### User Roles & Permissions
- **Parents**: Read-only access to rotation schedules and their children's attendance
- **Day Care Staff**: Full access - can view and edit rotation plans, capacity settings, and child assignments

### Registration & Authentication Workflow
- **Child Registration**: Staff adds children to groups and generates unique registration codes
- **Parent Registration**: Parents use registration code on first visit to create account and link to child
- **Multi-Parent Support**: Same registration code can be used by multiple parents for one child
- **Parent Account Creation**: First name, last name, email, phone (optional), password
- **Subsequent Logins**: Email and password authentication

### Data Model Requirements
- **Users**: Role (parent/staff), email, password, first_name, last_name, phone (optional)
- **Children**: Name, assigned group (A/B/C/D), registration_code (unique), created_by_staff
- **User_Child_Links**: Many-to-many relationship between parents and children
- **Daily_Schedules**: Date, group_order array, capacity_limit, attending_groups
- **Attendance**: Historical tracking of which groups attended each day

## Architecture Decisions

### Technology Stack Recommendations
- **Frontend**: React with Material UI for styling and component library
- **Backend**: Node.js/Express for API with authentication middleware
- **Database**: MariaDB 10.6 MySQL hosted on himalia.uberspace.de
- **Authentication**: JWT tokens or session-based auth for role management
- **State Management**: Context/Redux for user state and schedule data

### Development Environment
- **Database Host**: himalia.uberspace.de
- **Database Type**: MariaDB 10.6 (MySQL compatible)
- **UI Framework**: Material UI components for consistent design
- **Component Library**: Leverage MUI components (Button, Slider, DatePicker, Card, etc.)

### Key Components to Implement
1. **Authentication System**: Login/logout with role-based access control
2. **Parent Registration Flow**: Registration code validation and account creation
3. **Child Management**: Staff interface for adding children and generating codes
4. **Main Entry Page**: Daily group display with role-specific controls (see UI Requirements)
5. **Schedule Manager**: CRUD operations for daily rotation plans (staff only)
6. **Parent Dashboard**: Read-only view of child's schedule and attendance
7. **Staff Dashboard**: Full editing capabilities for schedules and capacity
8. **Schedule Visualizer**: Calendar view with role-appropriate interactions

## UI Requirements

### Main Entry Page Layout
The primary interface displays:
1. **Four Group Lists**: Groups A, B, C, D shown in daily priority order (starting with current day)
2. **Day Selector**: Date picker/calendar control to view different days
3. **Role-Specific Controls**:
   - **Parents**: Status indicator showing if their child's group can attend today
   - **Day Care Staff**: Capacity slider to set how many groups are allowed to attend
4. **Group Visibility**: All users can see children names within each group list

### Parent View Features
- **Child Status Display**: Clear visual indicator (e.g., "Your child Emma can attend today" or "Emma's group is not attending today")
- **Group Lists**: Read-only view of all four groups with children names visible
- **Day Navigation**: Can browse different days to see future/past schedules

### Staff View Features
- **Capacity Control**: Slider/selector for group capacity (1-4 groups)
- **Real-time Updates**: Group lists update immediately when capacity changes
- **Visual Feedback**: Clear indication of which groups are attending vs staying home
- **Edit Access**: Ability to modify group assignments and daily schedules

## Development Patterns

### Naming Conventions
- Use `groupOrder` for daily priority arrays: `['A','B','C','D']`
- Use `attendingGroups` for filtered groups based on capacity
- Use `userRole` for authentication: `'parent'` or `'staff'`
- Use `isEditable` flags for UI component permissions
- Use `selectedDate` for day selector state
- Use `capacityLimit` for staff slider value (1-4)
- Use `childStatus` for parent attendance indicators

### Critical Business Rules
- Daily group order must be fetched from database, never calculated
- Parents can only view data related to their own children's status
- Staff can edit all schedules and child assignments
- Capacity cuts always from end of daily order, never arbitrary
- Authentication required for all application access
- Group lists are visible to all authenticated users
- Main page defaults to current date on load

### Permission Patterns
- Wrap edit functions with role checks: `if (userRole === 'staff')`
- Use conditional rendering for edit UI: `{isStaff && <CapacitySlider />}`
- Implement API middleware to verify staff permissions on mutations
- Show child status only to parents: `{isParent && <ChildStatusIndicator />}`

### Testing Priorities
- Authentication and authorization flows for both user types
- Database queries for schedule retrieval and updates
- Role-based UI rendering and permission enforcement
- Parent-child data associations and access restrictions
- Schedule modification workflows (staff only)