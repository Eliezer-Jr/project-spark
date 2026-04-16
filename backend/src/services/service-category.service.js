import { AppError } from "../exceptions/AppError.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { MESSAGES } from "../constants/messages.js";
import { createId } from "../utils/id.js";
import { serviceCategoryModel } from "../models/service-category.model.js";
import { sortBy } from "../utils/sort.js";

export const serviceCategoryService = {
  async getCategories() {
    const categories = await serviceCategoryModel.findAll();
    return sortBy(categories, "name", "asc");
  },

  async createCategory({ name, description = "", icon = null }) {
    if (!name?.trim()) {
      throw new AppError(MESSAGES.CATEGORY_NAME_REQUIRED, HTTP_STATUS.BAD_REQUEST);
    }

    return serviceCategoryModel.create({
      id: createId(),
      name: name.trim(),
      description: description.trim() || null,
      icon,
      createdAt: new Date().toISOString(),
    });
  },

  async updateCategory(id, payload) {
    const category = await serviceCategoryModel.updateById(id, {
      ...payload,
      name: payload.name?.trim() || payload.name,
      description: typeof payload.description === "string" ? payload.description.trim() || null : payload.description,
    });

    if (!category) {
      throw new AppError(MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return category;
  },

  async deleteCategory(id) {
    const removed = await serviceCategoryModel.deleteById(id);
    if (!removed) {
      throw new AppError(MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return removed;
  },
};
