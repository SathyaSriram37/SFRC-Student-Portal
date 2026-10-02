from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    admin,
    users,
    students,
    faculty,
    parents,
    attendance,
    marks,
    complaints,
    announcements,
    events,
    library,
    hostel,
    ai,
    mentoring,
    facilities,
    econtent,
    placement,
    research,
    student_life,
    alumni,
    iqac,
    policies,
    notifications,
    transport,
    sports,
    integrations,
    search,
)

api_router = APIRouter()

api_router.include_router(auth.router,          prefix="/auth",          tags=["Auth"])
api_router.include_router(admin.router,         prefix="/admin",         tags=["Admin"])
api_router.include_router(users.router,         prefix="/users",         tags=["Users"])
api_router.include_router(students.router,      prefix="/students",      tags=["Students"])
api_router.include_router(faculty.router,       prefix="/faculty",       tags=["Faculty"])
api_router.include_router(parents.router,       prefix="/parents",       tags=["Parents"])
api_router.include_router(mentoring.router,     prefix="/mentoring",     tags=["Mentoring"])
api_router.include_router(attendance.router,    prefix="/attendance",    tags=["Attendance"])
api_router.include_router(marks.router,         prefix="/marks",         tags=["Marks"])
api_router.include_router(complaints.router,    prefix="/complaints",    tags=["Campus Care"])
api_router.include_router(facilities.router,    prefix="/facilities",    tags=["Facilities"])
api_router.include_router(transport.router,     tags=["Transport"])
api_router.include_router(sports.router,        tags=["Sports & Athletics"])
api_router.include_router(econtent.router,      prefix="/econtent",      tags=["E-Content LMS"])
api_router.include_router(placement.router,     prefix="/placement",     tags=["Placement & Career"])
api_router.include_router(research.router,      prefix="/research",      tags=["Research & Innovation"])
api_router.include_router(student_life.router,  tags=["Student Life & Clubs"])
api_router.include_router(alumni.router,        prefix="/alumni",        tags=["Alumni"])
api_router.include_router(iqac.router,          prefix="/admin/iqac",    tags=["IQAC Quality Management"])
api_router.include_router(policies.router,      tags=["Policies & Compliance"])
api_router.include_router(announcements.router, prefix="/announcements", tags=["Announcements"])
api_router.include_router(events.router,        prefix="/events",        tags=["Events"])
api_router.include_router(library.router,       prefix="/library",       tags=["Library"])
api_router.include_router(hostel.router,        prefix="/hostel",        tags=["Hostel"])
api_router.include_router(ai.router,            tags=["Pragya AI & RAG"])
api_router.include_router(notifications.router, tags=["Notifications & Alerts"])
api_router.include_router(integrations.router,  tags=["ERMS Integration"])
api_router.include_router(search.router,        tags=["Global Search"])



