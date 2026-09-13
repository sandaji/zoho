
export const successResponse = (data: any, message = 'Success', statusCode = 200) => {
    return {
        success: true,
        message,
        statusCode,
        data,
    };
};

export const errorResponse = (message = 'Error', statusCode = 500, errors: any = null) => {
    return {
        success: false,
        message,
        statusCode,
        errors,
    };
};
