import { AppError } from "../exceptions/AppError.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { MESSAGES } from "../constants/messages.js";
import { userModel } from "../models/user.model.js";
import { sortBy } from "../utils/sort.js";

function sanitizeUser(user) {
  const { passwordHash, ...safeUser } = user;
  return {
    ...safeUser,
    isActive: Boolean(safeUser.isActive),
  };
}

export const userService = {
  async getAllUsers(filters = {}) {
    const users = await userModel.findAll();
    let filtered = users;

    if (filters.role) {
      filtered = filtered.filter((user) => user.role === filters.role);
    }

    if (typeof filters.isActive === "boolean") {
      filtered = filtered.filter((user) => Boolean(user.isActive) === filters.isActive);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter((user) =>
        [user.fullName, user.email, user.specialization, user.location].some((value) => value?.toLowerCase().includes(search)),
      );
    }

    return sortBy(filtered.map(sanitizeUser), "createdAt", "desc");
  },

  async getUserById(id) {
    const user = await userModel.findById(id);
    if (!user) {
      throw new AppError(MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return sanitizeUser(user);
  },

  async updateUserStatus(id, isActive) {
    const user = await userModel.updateById(id, { isActive });
    if (!user) {
      throw new AppError(MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return sanitizeUser(user);
  },

  async updateUserProfile(id, payload) {
    const user = await userModel.updateById(id, {
      ...payload,
      fullName: payload.fullName?.trim() || payload.fullName,
      phone: typeof payload.phone === "string" ? payload.phone.trim() || null : payload.phone,
      location: typeof payload.location === "string" ? payload.location.trim() || null : payload.location,
      specialization:
        typeof payload.specialization === "string" ? payload.specialization.trim() || null : payload.specialization,
      bio: typeof payload.bio === "string" ? payload.bio.trim() || null : payload.bio,
    });

    if (!user) {
      throw new AppError(MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return sanitizeUser(user);
  },
};
