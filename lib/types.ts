export type ReportStatus = "pending" | "in-progress" | "resolved"
export type ReportCategory = "sanitation" | "roads" | "water" | "electrical" | "other"

export interface Report {
  id: string
  title: string
  location: string
  category: ReportCategory
  status: ReportStatus
  severity: "low" | "medium" | "high"
  description: string
  timestamp: Date
  reportedBy?: string
  assignedTo?: string
  resolvedAt?: Date
  imageUrl?: string
  activityLog?: ActivityLogEntry[]
}

export interface ActivityLogEntry {
  id: string
  action: string
  user: string
  timestamp: Date
  details?: string
}

export interface Team {
  id: string
  name: string
  department: string
  members: number
  activeJobs: number
}

export const mockReports: Report[] = [
  {
    id: "1",
    title: "Blocked Drain",
    location: "Circular Rd, Freetown",
    category: "water",
    status: "pending",
    severity: "high",
    description: "Large debris blocking storm drain causing flooding during rain. Water backing up onto road.",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    reportedBy: "citizen_001",
    imageUrl: "/blocked-drain-flooding.jpg",
    activityLog: [
      { id: "1", action: "Report submitted", user: "Citizen", timestamp: new Date(Date.now() - 1000 * 60 * 30) },
    ],
  },
  {
    id: "2",
    title: "Pothole Hazard",
    location: "Wilkinson Rd",
    category: "roads",
    status: "in-progress",
    severity: "medium",
    description: "Deep pothole in main road causing accidents. Multiple vehicles damaged.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    reportedBy: "citizen_002",
    assignedTo: "Roads Team Alpha",
    imageUrl: "/pothole-road-damage.jpg",
    activityLog: [
      { id: "1", action: "Report submitted", user: "Citizen", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
      {
        id: "2",
        action: "Assigned to Roads Team Alpha",
        user: "Admin",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1),
      },
      {
        id: "3",
        action: "Status changed to In Progress",
        user: "Roads Team Alpha",
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
      },
    ],
  },
  {
    id: "3",
    title: "Trash Accumulation",
    location: "Lumley Beach Rd",
    category: "sanitation",
    status: "resolved",
    severity: "low",
    description: "Uncollected garbage near market area attracting pests.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    reportedBy: "citizen_001",
    assignedTo: "Sanitation Unit B",
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 1),
    imageUrl: "/garbage-trash-collection.jpg",
    activityLog: [
      { id: "1", action: "Report submitted", user: "Citizen", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5) },
      {
        id: "2",
        action: "Assigned to Sanitation Unit B",
        user: "Admin",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
      },
      {
        id: "3",
        action: "Status changed to In Progress",
        user: "Sanitation Unit B",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
      },
      {
        id: "4",
        action: "Issue resolved - Area cleaned",
        user: "Sanitation Unit B",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1),
      },
    ],
  },
  {
    id: "4",
    title: "Broken Street Light",
    location: "Siaka Stevens St",
    category: "electrical",
    status: "pending",
    severity: "medium",
    description: "Street light not working, safety hazard at night. Area is very dark.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    reportedBy: "citizen_003",
    imageUrl: "/broken-street-light-night.jpg",
    activityLog: [
      { id: "1", action: "Report submitted", user: "Citizen", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8) },
    ],
  },
  {
    id: "5",
    title: "Water Leak",
    location: "Kissy Rd",
    category: "water",
    status: "in-progress",
    severity: "high",
    description: "Major water pipe burst flooding street. Wasting clean water.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
    reportedBy: "citizen_001",
    assignedTo: "GUMA Valley Team",
    imageUrl: "/water-pipe-burst-leak.jpg",
    activityLog: [
      { id: "1", action: "Report submitted", user: "Citizen", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12) },
      {
        id: "2",
        action: "Marked as High Priority",
        user: "Admin",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 11),
      },
      {
        id: "3",
        action: "Assigned to GUMA Valley Team",
        user: "Admin",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 10),
      },
    ],
  },
]

export const mockTeams: Team[] = [
  { id: "1", name: "Roads Team Alpha", department: "Public Works", members: 8, activeJobs: 3 },
  { id: "2", name: "Sanitation Unit B", department: "Environment", members: 12, activeJobs: 5 },
  { id: "3", name: "GUMA Valley Team", department: "Water Services", members: 6, activeJobs: 2 },
  { id: "4", name: "Electrical Response", department: "EDSA", members: 10, activeJobs: 4 },
  { id: "5", name: "Emergency Response", department: "City Council", members: 15, activeJobs: 1 },
]

export const emergencyContacts = [
  { name: "Police Emergency", number: "999", icon: "shield" },
  { name: "Fire Service", number: "019", icon: "flame" },
  { name: "Ambulance", number: "999", icon: "ambulance" },
  { name: "City Council Hotline", number: "+232 22 222 456", icon: "building" },
]
