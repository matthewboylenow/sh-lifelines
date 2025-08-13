import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden")
  }
  return user
}

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return await bcrypt.compare(password, hashedPassword)
}

// Role checking utilities
export function isAdmin(role: UserRole) {
  return role === UserRole.ADMIN
}

export function isFormationSupport(role: UserRole) {
  return role === UserRole.FORMATION_SUPPORT_TEAM || isAdmin(role)
}

export function isLifeLineLeader(role: UserRole) {
  return role === UserRole.LIFELINE_LEADER || isFormationSupport(role)
}

export function canAccessDashboard(role: UserRole) {
  return role !== UserRole.MEMBER
}

export function canManageUsers(role: UserRole) {
  return isAdmin(role)
}

export function canManageFormationRequests(role: UserRole) {
  return isFormationSupport(role)
}

export function canManageSupportTickets(role: UserRole) {
  return isFormationSupport(role)
}

export function canManageLifeLines(userId: string, lifeLineLeaderId: string, role: UserRole) {
  return userId === lifeLineLeaderId || isFormationSupport(role)
}

export function canViewInquiries(userId: string, lifeLineLeaderId: string, role: UserRole) {
  return userId === lifeLineLeaderId || isFormationSupport(role)
}

export function canViewSupportTickets(userId: string, ticketRequesterId: string, role: UserRole) {
  return userId === ticketRequesterId || isFormationSupport(role)
}